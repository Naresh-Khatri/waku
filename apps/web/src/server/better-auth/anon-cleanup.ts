import "server-only";

import {
  anonLink,
  asset,
  session,
  template,
  user,
} from "@waku/db";
import {
  and,
  eq,
  gt,
  inArray,
  isNotNull,
  lt,
  ne,
  notExists,
  sql,
} from "drizzle-orm";

import { db } from "@/server/db";
import { storage } from "@/server/storage";

import { markLinkFailed, migrateAnonData } from "./anon-link";

const ANON_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const LINK_RETRY_AFTER_MS = 5 * 60 * 1000;
const RECONCILE_BATCH = 100;
const CLEANUP_BATCH = 500;

export type CleanupResult = {
  reconciled: number;
  reconcileFailed: number;
  deletedUsers: number;
  deletedObjects: number;
};

/**
 * Finish conversions whose onLinkAccount attempt never completed. Safe to
 * run repeatedly: migrateAnonData is idempotent and flips the row to "done"
 * + deletes the anon user in its own transaction on success.
 */
async function reconcilePendingLinks(): Promise<{
  reconciled: number;
  reconcileFailed: number;
}> {
  const cutoff = new Date(Date.now() - LINK_RETRY_AFTER_MS);
  const pending = await db
    .select()
    .from(anonLink)
    .where(and(ne(anonLink.status, "done"), lt(anonLink.updatedAt, cutoff)))
    .limit(RECONCILE_BATCH);

  let reconciled = 0;
  let reconcileFailed = 0;
  for (const link of pending) {
    try {
      await migrateAnonData(link.anonUserId, link.targetUserId);
      reconciled += 1;
    } catch (error) {
      await markLinkFailed(link.anonUserId, error);
      reconcileFailed += 1;
    }
  }
  return { reconciled, reconcileFailed };
}

/**
 * Delete anonymous users idle past the TTL. Order matters: collect and
 * delete the R2 objects FIRST, then the rows — a crash between leaves the
 * users for the next run to retry rather than orphaning blobs forever.
 * Never touches anons that still have a non-"done" anon_link row (their
 * data is still waiting to be claimed by the reconcile pass).
 */
async function cleanupStaleAnons(): Promise<{
  deletedUsers: number;
  deletedObjects: number;
}> {
  const ttlCutoff = new Date(Date.now() - ANON_TTL_MS);
  const now = new Date();

  const stale = await db
    .select({ id: user.id })
    .from(user)
    .where(
      and(
        eq(user.isAnonymous, true),
        lt(user.updatedAt, ttlCutoff),
        notExists(
          db
            .select({ one: sql`1` })
            .from(session)
            .where(
              and(
                eq(session.userId, user.id),
                gt(session.expiresAt, now),
              ),
            ),
        ),
        notExists(
          db
            .select({ one: sql`1` })
            .from(anonLink)
            .where(
              and(
                eq(anonLink.anonUserId, user.id),
                ne(anonLink.status, "done"),
              ),
            ),
        ),
      ),
    )
    .limit(CLEANUP_BATCH);

  const ids = stale.map((r) => r.id);
  if (ids.length === 0) return { deletedUsers: 0, deletedObjects: 0 };

  const [assets, thumbs] = await Promise.all([
    db
      .select({ key: asset.storageKey })
      .from(asset)
      .where(inArray(asset.userId, ids)),
    db
      .select({ key: template.thumbnailKey })
      .from(template)
      .where(
        and(inArray(template.userId, ids), isNotNull(template.thumbnailKey)),
      ),
  ]);

  const keys = [
    ...assets.map((a) => a.key),
    ...thumbs.map((t) => t.key).filter((k): k is string => Boolean(k)),
  ];
  if (keys.length > 0) await storage.delete(keys);

  // Cascade clears asset / template / template_version / chat / credit /
  // profile / secret / anon_link rows for these users.
  await db.delete(user).where(inArray(user.id, ids));

  return { deletedUsers: ids.length, deletedObjects: keys.length };
}

export async function runAnonCleanup(): Promise<CleanupResult> {
  // Reconcile first so a just-converted user isn't mistaken for an
  // abandoned guest and reaped in the same run.
  const { reconciled, reconcileFailed } = await reconcilePendingLinks();
  const { deletedUsers, deletedObjects } = await cleanupStaleAnons();
  return { reconciled, reconcileFailed, deletedUsers, deletedObjects };
}
