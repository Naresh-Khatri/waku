import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { renderLog, template, templateVersion } from "@waku/db";
import { z } from "zod";

import { TemplateDocumentZ } from "@/components/template-editor/schema";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

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
    return ctx.db
      .select({
        id: template.id,
        slug: template.slug,
        name: template.name,
        publishedVersionId: template.publishedVersionId,
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
      return ctx.db.transaction(async (tx) => {
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

        const [version] = await tx
          .insert(templateVersion)
          .values({
            templateId: tpl.id,
            version: 1,
            documentJson: input.documentJson,
          })
          .returning();
        if (!version) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        return { template: tpl, version };
      });
    }),

  updateDraft: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }).merge(draftInputSchema))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
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
        if (row.version.publishedAt !== null) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "cannot edit a published version",
          });
        }

        const [updated] = await tx
          .update(templateVersion)
          .set({
            documentJson: input.documentJson,
          })
          .where(eq(templateVersion.id, input.versionId))
          .returning();
        await tx
          .update(template)
          .set({ updatedAt: new Date() })
          .where(eq(template.id, row.template.id));
        return updated;
      });
    }),

  createVersion: protectedProcedure
    .input(
      z.object({ templateId: z.string().uuid() }).merge(draftInputSchema),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const tpl = await tx.query.template.findFirst({
          where: eq(template.id, input.templateId),
        });
        if (!tpl || tpl.userId !== ctx.session.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const latest = await tx
          .select({ v: sql<number>`MAX(${templateVersion.version})` })
          .from(templateVersion)
          .where(eq(templateVersion.templateId, tpl.id));
        const nextVersion = (latest[0]?.v ?? 0) + 1;

        const [version] = await tx
          .insert(templateVersion)
          .values({
            templateId: tpl.id,
            version: nextVersion,
            documentJson: input.documentJson,
          })
          .returning();
        await tx
          .update(template)
          .set({ updatedAt: new Date() })
          .where(eq(template.id, tpl.id));
        return version;
      });
    }),

  publish: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
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

        const now = new Date();
        const publishedAt = row.version.publishedAt ?? now;
        await tx
          .update(templateVersion)
          .set({ publishedAt })
          .where(eq(templateVersion.id, row.version.id));
        await tx
          .update(template)
          .set({ publishedVersionId: row.version.id, updatedAt: now })
          .where(eq(template.id, row.template.id));
        return { versionId: row.version.id, publishedAt };
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
