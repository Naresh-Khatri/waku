import "server-only";

import { and, eq } from "drizzle-orm";
import {
  createDb,
  wakuRenderLog,
  wakuTemplate,
  wakuTemplateVersion,
  wakuUserProfile,
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

const globalForDb = globalThis as unknown as { wakuDb?: Db };
export const getDb = (): Db => {
  if (!globalForDb.wakuDb) {
    globalForDb.wakuDb = createDb(env.DATABASE_URL).db;
  }
  return globalForDb.wakuDb;
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
      templateId: wakuTemplate.id,
      versionId: wakuTemplateVersion.id,
      version: wakuTemplateVersion.version,
      document: wakuTemplateVersion.documentJson,
    })
    .from(wakuTemplateVersion)
    .innerJoin(wakuTemplate, eq(wakuTemplate.id, wakuTemplateVersion.templateId))
    .innerJoin(wakuUserProfile, eq(wakuUserProfile.userId, wakuTemplate.userId))
    .where(
      and(
        eq(wakuUserProfile.handle, handle),
        eq(wakuTemplate.slug, slug),
        eq(wakuTemplateVersion.version, version),
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
    .insert(wakuRenderLog)
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
      version: wakuTemplateVersion.version,
      versionId: wakuTemplateVersion.id,
    })
    .from(wakuTemplate)
    .innerJoin(
      wakuTemplateVersion,
      eq(wakuTemplateVersion.id, wakuTemplate.publishedVersionId),
    )
    .innerJoin(wakuUserProfile, eq(wakuUserProfile.userId, wakuTemplate.userId))
    .where(
      and(eq(wakuUserProfile.handle, handle), eq(wakuTemplate.slug, slug)),
    )
    .limit(1);

  const row = rows[0];
  publishedCache.set(cacheKey, {
    versionId: row?.versionId ?? null,
    expiresAt: now + PUBLISHED_TTL_MS,
  });
  return row?.version ?? null;
};
