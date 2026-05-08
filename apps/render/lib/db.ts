import "server-only";

import { and, eq } from "drizzle-orm";
import {
  createDb,
  renderLog,
  template,
  templateVersion,
  userProfile,
  type Db,
  type TemplateDocumentRow,
} from "@waku/db";

import { env } from "@/env";

export type LoadedTemplateVersion = {
  templateId: string;
  versionId: string;
  version: number;
  document: TemplateDocumentRow;
};

const globalForDb = globalThis as unknown as { db?: Db };
export const getDb = (): Db => {
  if (!globalForDb.db) {
    globalForDb.db = createDb(env.DATABASE_URL).db;
  }
  return globalForDb.db;
};

// IR is immutable per (templateId, version) — cache forever once loaded.
const versionCache = new Map<string, LoadedTemplateVersion>();
const versionKey = (handle: string, slug: string, version: number) =>
  `${handle}/${slug}/${version}`;

// Slug→published-version-id resolution may change on publish; short TTL.
type PublishedRef = { versionId: string | null; expiresAt: number };
const publishedCache = new Map<string, PublishedRef>();
const PUBLISHED_TTL_MS = 60_000;

export const loadTemplateVersion = async (
  handle: string,
  slug: string,
  version: number,
): Promise<LoadedTemplateVersion | null> => {
  const key = versionKey(handle, slug, version);
  const cached = versionCache.get(key);
  if (cached) return cached;

  const db = getDb();
  const rows = await db
    .select({
      templateId: template.id,
      versionId: templateVersion.id,
      version: templateVersion.version,
      document: templateVersion.documentJson,
    })
    .from(templateVersion)
    .innerJoin(template, eq(template.id, templateVersion.templateId))
    .innerJoin(userProfile, eq(userProfile.userId, template.userId))
    .where(
      and(
        eq(userProfile.handle, handle),
        eq(template.slug, slug),
        eq(templateVersion.version, version),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const loaded: LoadedTemplateVersion = {
    templateId: row.templateId,
    versionId: row.versionId,
    version: row.version,
    document: row.document,
  };
  versionCache.set(key, loaded);
  return loaded;
};

export type RenderLogEntry = {
  templateVersionId: string;
  paramsHash: string;
  format: string;
  ms: number;
  status: number;
};

// Fire-and-forget — never throws into the response path.
export const recordRenderLog = (entry: RenderLogEntry): void => {
  void getDb()
    .insert(renderLog)
    .values(entry)
    .catch((err: unknown) => {
      console.error("[render-log] insert failed", err);
    });
};

export const resolvePublishedVersion = async (
  handle: string,
  slug: string,
): Promise<number | null> => {
  const cacheKey = `${handle}/${slug}`;
  const now = Date.now();
  const cached = publishedCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    if (!cached.versionId) return null;
  }

  const db = getDb();
  const rows = await db
    .select({
      version: templateVersion.version,
      versionId: templateVersion.id,
    })
    .from(template)
    .innerJoin(
      templateVersion,
      eq(templateVersion.id, template.publishedVersionId),
    )
    .innerJoin(userProfile, eq(userProfile.userId, template.userId))
    .where(
      and(eq(userProfile.handle, handle), eq(template.slug, slug)),
    )
    .limit(1);

  const row = rows[0];
  publishedCache.set(cacheKey, {
    versionId: row?.versionId ?? null,
    expiresAt: now + PUBLISHED_TTL_MS,
  });
  return row?.version ?? null;
};
