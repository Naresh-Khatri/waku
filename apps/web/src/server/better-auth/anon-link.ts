import "server-only";

import {
  aiGeneration,
  anonLink,
  asset,
  chatConversation,
  creditBalance,
  creditLedger,
  renderLog,
  template,
  userProfile, // only for the targetHasProfile probe
} from "@waku/db";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/server/db";

// Tables owned by a text userId FK with no uniqueness on it — safe to
// blindly re-point from the anon user to the target user.
const BLIND_REPOINT = [
  asset,
  chatConversation,
  aiGeneration,
  creditLedger,
  renderLog,
] as const;

/**
 * Record conversion intent BEFORE the migration runs, OUTSIDE the migration
 * transaction, so it survives a rollback and the cleanup/reconcile cron can
 * finish a failed/partial attempt. Idempotent — replays bump `attempts`.
 */
export async function recordLinkIntent(
  anonUserId: string,
  targetUserId: string,
): Promise<void> {
  await db
    .insert(anonLink)
    .values({ anonUserId, targetUserId, status: "pending" })
    .onConflictDoUpdate({
      target: anonLink.anonUserId,
      set: {
        targetUserId,
        status: "pending",
        attempts: sql`${anonLink.attempts} + 1`,
        updatedAt: new Date(),
      },
    });
}

/** Mark a failed attempt so the reconcile pass retries it later. */
export async function markLinkFailed(
  anonUserId: string,
  error: unknown,
): Promise<void> {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "unknown error";
  await db
    .update(anonLink)
    .set({ status: "failed", lastError: message.slice(0, 500), updatedAt: new Date() })
    .where(eq(anonLink.anonUserId, anonUserId));
}

/**
 * Move all of an anonymous user's work onto the real account, then delete the
 * anon user — all in one transaction. Idempotent and replay-safe: each step
 * is scoped `WHERE userId = fromId`, so re-running after a move is a no-op.
 *
 * Verified against better-auth 1.6.9: onLinkAccount fires even when the
 * credential is linked onto the anon user in place (fromId === toId) — the
 * early return below prevents step 5 from deleting the just-converted account.
 */
export async function migrateAnonData(
  fromId: string,
  toId: string,
): Promise<void> {
  if (fromId === toId) return;

  await db.transaction(async (tx) => {
    const targetHasProfile = !!(await tx.query.userProfile.findFirst({
      where: eq(userProfile.userId, toId),
      columns: { userId: true },
    }));

    // 1. template — unique (user_id, slug); rename anon's slug on collision.
    const anonTemplates = await tx
      .select({ id: template.id, slug: template.slug })
      .from(template)
      .where(eq(template.userId, fromId));
    for (const t of anonTemplates) {
      const clash = await tx.query.template.findFirst({
        where: and(eq(template.userId, toId), eq(template.slug, t.slug)),
        columns: { id: true },
      });
      await tx
        .update(template)
        .set({
          userId: toId,
          ...(clash ? { slug: `${t.slug}-${t.id.slice(0, 6)}` } : {}),
        })
        .where(eq(template.id, t.id));
    }

    // 2. blind re-points (no userId uniqueness).
    for (const tbl of BLIND_REPOINT) {
      await tx
        .update(tbl)
        .set({ userId: toId })
        .where(eq(tbl.userId, fromId));
    }

    // 3. credit_balance — move on fresh account, sum on pre-existing.
    const anonBal = await tx.query.creditBalance.findFirst({
      where: eq(creditBalance.userId, fromId),
    });
    if (anonBal && anonBal.balance > 0) {
      if (targetHasProfile) {
        const updated = await tx
          .update(creditBalance)
          .set({
            balance: sql`${creditBalance.balance} + ${anonBal.balance}`,
            updatedAt: new Date(),
          })
          .where(eq(creditBalance.userId, toId))
          .returning({ balance: creditBalance.balance });
        const after = updated[0]?.balance ?? anonBal.balance;
        await tx.insert(creditLedger).values({
          userId: toId,
          delta: anonBal.balance,
          reason: "anon_merge",
          balanceAfter: after,
        });
      } else {
        await tx
          .update(creditBalance)
          .set({ userId: toId })
          .where(eq(creditBalance.userId, fromId));
      }
    }

    // 4. profile + secret are NEVER migrated (handle re-pick by design):
    //    anon's user_profile/user_secret rows fall to step 5's cascade.

    // 5. flip intent → done and delete the anon user, atomically. Cascade
    //    clears its leftover profile/secret/session/balance rows.
    await tx
      .update(anonLink)
      .set({ status: "done", updatedAt: new Date() })
      .where(eq(anonLink.anonUserId, fromId));
    await tx.execute(sql`DELETE FROM "user" WHERE id = ${fromId}`);
  });
}
