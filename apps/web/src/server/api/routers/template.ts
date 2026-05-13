import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import {
  chatConversation,
  chatMessage,
  renderLog,
  stockTemplate,
  template,
  templateCategory,
  templateVersion,
} from "@waku/db";
import { z } from "zod";

import { TemplateDocumentZ } from "@/components/template-editor/schema";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import type { Db } from "@waku/db";
import { storage } from "@/server/storage";
import { renderUserThumbnail } from "@/server/thumbnails";

// Re-renders the cached thumbnail and stamps thumbnailKey on the template row.
// Awaited so callers can return the refreshed row, but errors are swallowed —
// the document write is the source of truth and a stale/missing thumbnail just
// shows the placeholder until the next save.
const refreshThumbnail = async (
  db: Db,
  templateId: string,
  versionId: string,
): Promise<string | null> => {
  const key = await renderUserThumbnail({ templateId, versionId });
  if (!key) return null;
  try {
    await db
      .update(template)
      .set({ thumbnailKey: key, thumbnailUpdatedAt: new Date() })
      .where(eq(template.id, templateId));
    return key;
  } catch (err) {
    console.warn(
      `[template] thumbnail key write failed for ${templateId}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
};

// Autosave fires repeatedly while the user edits. Only re-render the thumbnail
// when the cached one is missing or older than this window — the dashboard
// will be at most THUMBNAIL_DEBOUNCE_MS stale per template, which is fine.
const THUMBNAIL_DEBOUNCE_MS = 15_000;

const shouldRefreshThumbnail = (row: {
  thumbnailKey: string | null;
  thumbnailUpdatedAt: Date | null;
}): boolean => {
  if (!row.thumbnailKey || !row.thumbnailUpdatedAt) return true;
  return Date.now() - row.thumbnailUpdatedAt.getTime() >= THUMBNAIL_DEBOUNCE_MS;
};

const slugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase letters, digits, and dashes");

const draftInputSchema = z.object({
  documentJson: TemplateDocumentZ,
});

export const templateRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: template.id,
        slug: template.slug,
        name: template.name,
        publishedVersionId: template.publishedVersionId,
        thumbnailKey: template.thumbnailKey,
        thumbnailUpdatedAt: template.thumbnailUpdatedAt,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        latestVersion: sql<number>`(
          SELECT COALESCE(MAX(${templateVersion.version}), 0)
          FROM ${templateVersion}
          WHERE ${templateVersion.templateId} = ${template.id}
        )`.as("latest_version"),
      })
      .from(template)
      .where(eq(template.userId, ctx.session.user.id))
      .orderBy(desc(template.updatedAt));
    return rows.map((r) => ({
      ...r,
      thumbnailUrl: r.thumbnailKey
        ? `${storage.getReadUrl(r.thumbnailKey)}?v=${(r.thumbnailUpdatedAt ?? r.updatedAt).getTime()}`
        : null,
    }));
  }),

  // Recent-first user designs with cursor pagination. Used by the dashboard
  // "My designs" strip (small limit) and the full /designs page.
  listMine: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(50).default(12),
          cursor: z.string().datetime().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 12;
      const cursor = input?.cursor ? new Date(input.cursor) : null;

      const rows = await ctx.db
        .select({
          id: template.id,
          slug: template.slug,
          name: template.name,
          publishedVersionId: template.publishedVersionId,
          thumbnailKey: template.thumbnailKey,
          thumbnailUpdatedAt: template.thumbnailUpdatedAt,
          updatedAt: template.updatedAt,
        })
        .from(template)
        .where(
          cursor
            ? and(
                eq(template.userId, ctx.session.user.id),
                lt(template.updatedAt, cursor),
              )
            : eq(template.userId, ctx.session.user.id),
        )
        .orderBy(desc(template.updatedAt))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const sliced = hasMore ? rows.slice(0, limit) : rows;
      const items = sliced.map((r) => ({
        ...r,
        thumbnailUrl: r.thumbnailKey
          ? `${storage.getReadUrl(r.thumbnailKey)}?v=${(r.thumbnailUpdatedAt ?? r.updatedAt).getTime()}`
          : null,
      }));
      const last = items[items.length - 1];
      return {
        items,
        nextCursor: hasMore && last ? last.updatedAt.toISOString() : null,
      };
    }),

  // Public single-stock lookup powering /t/[slug] for guests and members.
  getPublicStock: publicProcedure
    .input(z.object({ slug: slugSchema }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: stockTemplate.id,
          slug: stockTemplate.slug,
          name: stockTemplate.name,
          description: stockTemplate.description,
          tags: stockTemplate.tags,
          thumbnailKey: stockTemplate.thumbnailKey,
          documentJson: stockTemplate.documentJson,
          updatedAt: stockTemplate.updatedAt,
          categoryId: stockTemplate.categoryId,
          categorySlug: templateCategory.slug,
          categoryName: templateCategory.name,
        })
        .from(stockTemplate)
        .leftJoin(
          templateCategory,
          eq(templateCategory.id, stockTemplate.categoryId),
        )
        .where(
          and(
            eq(stockTemplate.slug, input.slug),
            isNotNull(stockTemplate.publishedAt),
          ),
        )
        .limit(1);
      const r = rows[0];
      if (!r) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        description: r.description,
        tags: r.tags,
        thumbnailUrl: r.thumbnailKey
          ? `${storage.getReadUrl(r.thumbnailKey)}?v=${r.updatedAt.getTime()}`
          : null,
        documentJson: r.documentJson,
        category: r.categoryId
          ? { id: r.categoryId, slug: r.categorySlug!, name: r.categoryName! }
          : null,
      };
    }),

  // Server-side fork: copies a published stock template's document into a new
  // user-owned row. Picks the first free slug from base, base-2, base-3, ...
  // so re-forking the same stock template doesn't fight the unique constraint.
  forkFromStock: protectedProcedure
    .input(z.object({ stockSlug: slugSchema }))
    .mutation(async ({ ctx, input }) => {
      const stockRow = await ctx.db.query.stockTemplate.findFirst({
        where: and(
          eq(stockTemplate.slug, input.stockSlug),
          isNotNull(stockTemplate.publishedAt),
        ),
      });
      if (!stockRow) throw new TRPCError({ code: "NOT_FOUND" });

      const result = await ctx.db.transaction(async (tx) => {
        const userId = ctx.session.user.id;
        const base = stockRow.slug;
        const existing = await tx
          .select({ slug: template.slug })
          .from(template)
          .where(
            and(
              eq(template.userId, userId),
              sql`(${template.slug} = ${base} OR ${template.slug} LIKE ${base + "-%"})`,
            ),
          );
        const taken = new Set(existing.map((r) => r.slug));
        let chosen = base;
        let n = 2;
        while (taken.has(chosen)) {
          chosen = `${base}-${n}`;
          n += 1;
        }

        const [tpl] = await tx
          .insert(template)
          .values({ userId, slug: chosen, name: stockRow.name })
          .returning();
        if (!tpl) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const now = new Date();
        const [version] = await tx
          .insert(templateVersion)
          .values({
            templateId: tpl.id,
            version: 1,
            documentJson: stockRow.documentJson,
            publishedAt: now,
          })
          .returning();
        if (!version) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [tplWithPointer] = await tx
          .update(template)
          .set({ publishedVersionId: version.id })
          .where(eq(template.id, tpl.id))
          .returning();

        return { template: tplWithPointer ?? tpl, version };
      });

      // Render service runs in a separate process with its own DB connection,
      // so the new version must be committed before it can be looked up.
      await refreshThumbnail(ctx.db, result.template.id, result.version.id);
      return result;
    }),

  // Server-side fork: copies an AI-proposed design from a persisted chat message
  // into a user-owned template. Trust comes from re-reading the message from db
  // (scoped to the caller's conversation) rather than client-supplied json.
  forkFromAi: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        messageId: z.string().min(1),
        toolCallId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const convo = await ctx.db.query.chatConversation.findFirst({
        where: and(
          eq(chatConversation.id, input.conversationId),
          eq(chatConversation.userId, userId),
        ),
        columns: { id: true },
      });
      if (!convo) throw new TRPCError({ code: "NOT_FOUND" });

      const msg = await ctx.db.query.chatMessage.findFirst({
        where: and(
          eq(chatMessage.id, input.messageId),
          eq(chatMessage.conversationId, convo.id),
        ),
        columns: { parts: true },
      });
      if (!msg) throw new TRPCError({ code: "NOT_FOUND" });

      const proposal = (msg.parts as unknown[]).find((p): p is {
        type: string;
        toolCallId: string;
        state: string;
        output?: { name?: unknown; document?: unknown };
      } => {
        if (!p || typeof p !== "object") return false;
        const o = p as Record<string, unknown>;
        return (
          o.type === "tool-propose_design" &&
          o.state === "output-available" &&
          o.toolCallId === input.toolCallId
        );
      });
      if (!proposal?.output) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Design is not ready yet",
        });
      }

      const parsed = TemplateDocumentZ.safeParse(proposal.output.document);
      if (!parsed.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Stored design failed validation",
        });
      }
      const document = parsed.data;
      const rawName =
        typeof proposal.output.name === "string" && proposal.output.name.trim()
          ? proposal.output.name.trim().slice(0, 120)
          : "Design";

      const base =
        rawName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 56) || "design";

      const result = await ctx.db.transaction(async (tx) => {
        const existing = await tx
          .select({ slug: template.slug })
          .from(template)
          .where(
            and(
              eq(template.userId, userId),
              sql`(${template.slug} = ${base} OR ${template.slug} LIKE ${base + "-%"})`,
            ),
          );
        const taken = new Set(existing.map((r) => r.slug));
        let chosen = base;
        let n = 2;
        while (taken.has(chosen)) {
          chosen = `${base}-${n}`;
          n += 1;
        }

        const [tpl] = await tx
          .insert(template)
          .values({ userId, slug: chosen, name: rawName })
          .returning();
        if (!tpl) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [version] = await tx
          .insert(templateVersion)
          .values({
            templateId: tpl.id,
            version: 1,
            documentJson: document,
            publishedAt: new Date(),
          })
          .returning();
        if (!version) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [tplWithPointer] = await tx
          .update(template)
          .set({ publishedVersionId: version.id })
          .where(eq(template.id, tpl.id))
          .returning();

        return { template: tplWithPointer ?? tpl, version };
      });

      await refreshThumbnail(ctx.db, result.template.id, result.version.id);
      return result;
    }),

  // Catalogue feed: published stock templates with thumbnail URLs and category.
  listStock: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: stockTemplate.id,
        slug: stockTemplate.slug,
        name: stockTemplate.name,
        description: stockTemplate.description,
        tags: stockTemplate.tags,
        thumbnailKey: stockTemplate.thumbnailKey,
        documentJson: stockTemplate.documentJson,
        updatedAt: stockTemplate.updatedAt,
        categoryId: stockTemplate.categoryId,
        categorySlug: templateCategory.slug,
        categoryName: templateCategory.name,
        categorySortOrder: templateCategory.sortOrder,
      })
      .from(stockTemplate)
      .leftJoin(
        templateCategory,
        eq(templateCategory.id, stockTemplate.categoryId),
      )
      .where(isNotNull(stockTemplate.publishedAt))
      .orderBy(
        asc(templateCategory.sortOrder),
        asc(templateCategory.name),
        desc(stockTemplate.updatedAt),
      );
    return rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      tags: r.tags,
      thumbnailUrl: r.thumbnailKey
        ? `${storage.getReadUrl(r.thumbnailKey)}?v=${r.updatedAt.getTime()}`
        : null,
      // Catalogue cards prefer thumbnails — only ship the full document when
      // there's nothing else to render. Trims hot-path payload significantly.
      documentJson: r.thumbnailKey ? null : r.documentJson,
      category: r.categoryId
        ? { id: r.categoryId, slug: r.categorySlug!, name: r.categoryName! }
        : null,
    }));
  }),

  usage: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const totals = await ctx.db
      .select({
        renders: sql<number>`COUNT(*)::int`,
        p95Ms: sql<number | null>`PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY ${renderLog.ms})::int`,
        errors: sql<number>`COUNT(*) FILTER (WHERE ${renderLog.status} >= 400)::int`,
      })
      .from(renderLog)
      .innerJoin(
        templateVersion,
        eq(templateVersion.id, renderLog.templateVersionId),
      )
      .innerJoin(
        template,
        eq(template.id, templateVersion.templateId),
      )
      .where(
        and(
          eq(template.userId, userId),
          gte(renderLog.createdAt, monthStart),
        ),
      );

    const row = totals[0];
    return {
      renders: row?.renders ?? 0,
      errors: row?.errors ?? 0,
      p95Ms: row?.p95Ms ?? null,
    };
  }),

  get: protectedProcedure
    .input(z.object({ slug: slugSchema }))
    .query(async ({ ctx, input }) => {
      const tpl = await ctx.db.query.template.findFirst({
        where: and(
          eq(template.userId, ctx.session.user.id),
          eq(template.slug, input.slug),
        ),
      });
      if (!tpl) throw new TRPCError({ code: "NOT_FOUND" });

      const versions = await ctx.db
        .select({
          id: templateVersion.id,
          version: templateVersion.version,
          label: templateVersion.label,
          publishedAt: templateVersion.publishedAt,
          createdAt: templateVersion.createdAt,
        })
        .from(templateVersion)
        .where(eq(templateVersion.templateId, tpl.id))
        .orderBy(desc(templateVersion.version));

      return { ...tpl, versions };
    }),

  getVersion: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          version: templateVersion,
          template: template,
        })
        .from(templateVersion)
        .innerJoin(
          template,
          eq(template.id, templateVersion.templateId),
        )
        .where(eq(templateVersion.id, input.versionId))
        .limit(1);
      const row = rows[0];
      if (!row || row.template.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return row.version;
    }),

  create: protectedProcedure
    .input(
      z.object({
        slug: slugSchema,
        name: z.string().min(1).max(120),
        documentJson: TemplateDocumentZ,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const existing = await tx.query.template.findFirst({
          where: and(
            eq(template.userId, ctx.session.user.id),
            eq(template.slug, input.slug),
          ),
          columns: { id: true },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Template "${input.slug}" already exists`,
          });
        }

        const [tpl] = await tx
          .insert(template)
          .values({
            userId: ctx.session.user.id,
            slug: input.slug,
            name: input.name,
          })
          .returning();
        if (!tpl) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const now = new Date();
        const [version] = await tx
          .insert(templateVersion)
          .values({
            templateId: tpl.id,
            version: 1,
            documentJson: input.documentJson,
            publishedAt: now,
          })
          .returning();
        if (!version) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [tplWithPointer] = await tx
          .update(template)
          .set({ publishedVersionId: version.id })
          .where(eq(template.id, tpl.id))
          .returning();

        return { template: tplWithPointer ?? tpl, version };
      });

      await refreshThumbnail(ctx.db, result.template.id, result.version.id);
      return result;
    }),

  updateDraft: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }).merge(draftInputSchema))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const rows = await tx
          .select({
            version: templateVersion,
            template: template,
          })
          .from(templateVersion)
          .innerJoin(
            template,
            eq(template.id, templateVersion.templateId),
          )
          .where(eq(templateVersion.id, input.versionId))
          .limit(1);
        const row = rows[0];
        if (!row || row.template.userId !== ctx.session.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        // Snapshots (version > 1) are immutable; only the head row can be edited.
        if (row.version.version !== 1) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "snapshots are read-only — restore one to edit it",
          });
        }

        const now = new Date();
        const [updated] = await tx
          .update(templateVersion)
          .set({
            documentJson: input.documentJson,
            publishedAt: row.version.publishedAt ?? now,
          })
          .where(eq(templateVersion.id, input.versionId))
          .returning();
        await tx
          .update(template)
          .set({
            publishedVersionId: row.version.id,
            updatedAt: now,
          })
          .where(eq(template.id, row.template.id));
        return {
          updated,
          templateId: row.template.id,
          versionId: row.version.id,
          thumbnailKey: row.template.thumbnailKey,
          thumbnailUpdatedAt: row.template.thumbnailUpdatedAt,
        };
      });

      // Outside the transaction so a slow render service doesn't hold a write
      // lock on the row. Debounced — autosave hits this on every keystroke.
      if (
        shouldRefreshThumbnail({
          thumbnailKey: result.thumbnailKey,
          thumbnailUpdatedAt: result.thumbnailUpdatedAt,
        })
      ) {
        await refreshThumbnail(ctx.db, result.templateId, result.versionId);
      }
      return result.updated;
    }),

  listSnapshots: protectedProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const tpl = await ctx.db.query.template.findFirst({
        where: eq(template.id, input.templateId),
        columns: { id: true, userId: true },
      });
      if (!tpl || tpl.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return ctx.db
        .select({
          id: templateVersion.id,
          version: templateVersion.version,
          label: templateVersion.label,
          createdAt: templateVersion.createdAt,
        })
        .from(templateVersion)
        .where(
          and(
            eq(templateVersion.templateId, tpl.id),
            // version=1 is the head — exclude it from the snapshot list.
            sql`${templateVersion.version} > 1`,
          ),
        )
        .orderBy(desc(templateVersion.version));
    }),

  createSnapshot: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
        label: z.string().trim().min(1).max(80).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const tpl = await tx.query.template.findFirst({
          where: eq(template.id, input.templateId),
        });
        if (!tpl || tpl.userId !== ctx.session.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const headRows = await tx
          .select({ documentJson: templateVersion.documentJson })
          .from(templateVersion)
          .where(
            and(
              eq(templateVersion.templateId, tpl.id),
              eq(templateVersion.version, 1),
            ),
          )
          .limit(1);
        const head = headRows[0];
        if (!head) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "template has no head row to snapshot",
          });
        }

        const max = await tx
          .select({ v: sql<number>`MAX(${templateVersion.version})` })
          .from(templateVersion)
          .where(eq(templateVersion.templateId, tpl.id));
        const nextVersion = (max[0]?.v ?? 1) + 1;

        const [snapshot] = await tx
          .insert(templateVersion)
          .values({
            templateId: tpl.id,
            version: nextVersion,
            label: input.label ?? null,
            documentJson: head.documentJson,
          })
          .returning();
        return snapshot;
      });
    }),

  restoreSnapshot: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const rows = await tx
          .select({ version: templateVersion, template: template })
          .from(templateVersion)
          .innerJoin(template, eq(template.id, templateVersion.templateId))
          .where(eq(templateVersion.id, input.versionId))
          .limit(1);
        const row = rows[0];
        if (!row || row.template.userId !== ctx.session.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (row.version.version === 1) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "this is already the head — nothing to restore",
          });
        }

        const now = new Date();
        const [updated] = await tx
          .update(templateVersion)
          .set({
            documentJson: row.version.documentJson,
            publishedAt: now,
          })
          .where(
            and(
              eq(templateVersion.templateId, row.template.id),
              eq(templateVersion.version, 1),
            ),
          )
          .returning();
        await tx
          .update(template)
          .set({ updatedAt: now })
          .where(eq(template.id, row.template.id));
        return { updated, templateId: row.template.id };
      });

      if (result.updated) {
        await refreshThumbnail(ctx.db, result.templateId, result.updated.id);
      }
      return result.updated;
    }),

  renameSnapshot: protectedProcedure
    .input(
      z.object({
        versionId: z.string().uuid(),
        label: z.string().trim().min(1).max(80).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const rows = await tx
          .select({ version: templateVersion, template: template })
          .from(templateVersion)
          .innerJoin(template, eq(template.id, templateVersion.templateId))
          .where(eq(templateVersion.id, input.versionId))
          .limit(1);
        const row = rows[0];
        if (!row || row.template.userId !== ctx.session.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (row.version.version === 1) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "the head row cannot be labeled",
          });
        }
        const [updated] = await tx
          .update(templateVersion)
          .set({ label: input.label })
          .where(eq(templateVersion.id, input.versionId))
          .returning();
        return updated;
      });
    }),

  deleteSnapshot: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const rows = await tx
          .select({ version: templateVersion, template: template })
          .from(templateVersion)
          .innerJoin(template, eq(template.id, templateVersion.templateId))
          .where(eq(templateVersion.id, input.versionId))
          .limit(1);
        const row = rows[0];
        if (!row || row.template.userId !== ctx.session.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (row.version.version === 1) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "the head row cannot be deleted",
          });
        }
        await tx
          .delete(templateVersion)
          .where(eq(templateVersion.id, input.versionId));
        return { ok: true as const };
      });
    }),

  delete: protectedProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tpl = await ctx.db.query.template.findFirst({
        where: eq(template.id, input.templateId),
        columns: { id: true, userId: true },
      });
      if (!tpl || tpl.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      // null out publishedVersionId first to drop the cycle from version FK constraint.
      await ctx.db
        .update(template)
        .set({ publishedVersionId: null })
        .where(eq(template.id, tpl.id));
      await ctx.db.delete(template).where(eq(template.id, tpl.id));
      return { ok: true as const };
    }),
});
