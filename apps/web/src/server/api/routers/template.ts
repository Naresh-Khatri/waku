import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { wakuRenderLog, wakuTemplate, wakuTemplateVersion } from "@waku/db";
import { ParamsSchemaZ, TemplateIRSchema } from "@waku/ir";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const slugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase letters, digits, and dashes");

const draftInputSchema = z.object({
  irJson: TemplateIRSchema,
  paramsSchemaJson: ParamsSchemaZ,
});

export const templateRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: wakuTemplate.id,
        slug: wakuTemplate.slug,
        name: wakuTemplate.name,
        publishedVersionId: wakuTemplate.publishedVersionId,
        createdAt: wakuTemplate.createdAt,
        updatedAt: wakuTemplate.updatedAt,
        latestVersion: sql<number>`(
          SELECT COALESCE(MAX(${wakuTemplateVersion.version}), 0)
          FROM ${wakuTemplateVersion}
          WHERE ${wakuTemplateVersion.templateId} = ${wakuTemplate.id}
        )`.as("latest_version"),
      })
      .from(wakuTemplate)
      .where(eq(wakuTemplate.userId, ctx.session.user.id))
      .orderBy(desc(wakuTemplate.updatedAt));
  }),

  usage: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const totals = await ctx.db
      .select({
        renders: sql<number>`COUNT(*)::int`,
        p95Ms: sql<number | null>`PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY ${wakuRenderLog.ms})::int`,
        errors: sql<number>`COUNT(*) FILTER (WHERE ${wakuRenderLog.status} >= 400)::int`,
      })
      .from(wakuRenderLog)
      .innerJoin(
        wakuTemplateVersion,
        eq(wakuTemplateVersion.id, wakuRenderLog.templateVersionId),
      )
      .innerJoin(
        wakuTemplate,
        eq(wakuTemplate.id, wakuTemplateVersion.templateId),
      )
      .where(
        and(
          eq(wakuTemplate.userId, userId),
          gte(wakuRenderLog.createdAt, monthStart),
        ),
      );

    const top = await ctx.db
      .select({
        templateId: wakuTemplate.id,
        slug: wakuTemplate.slug,
        name: wakuTemplate.name,
        renders: sql<number>`COUNT(*)::int`,
      })
      .from(wakuRenderLog)
      .innerJoin(
        wakuTemplateVersion,
        eq(wakuTemplateVersion.id, wakuRenderLog.templateVersionId),
      )
      .innerJoin(
        wakuTemplate,
        eq(wakuTemplate.id, wakuTemplateVersion.templateId),
      )
      .where(
        and(
          eq(wakuTemplate.userId, userId),
          gte(wakuRenderLog.createdAt, monthStart),
        ),
      )
      .groupBy(wakuTemplate.id, wakuTemplate.slug, wakuTemplate.name)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(5);

    const row = totals[0];
    return {
      monthStart: monthStart.toISOString(),
      renders: row?.renders ?? 0,
      errors: row?.errors ?? 0,
      p95Ms: row?.p95Ms ?? null,
      top,
    };
  }),

  get: protectedProcedure
    .input(z.object({ slug: slugSchema }))
    .query(async ({ ctx, input }) => {
      const tpl = await ctx.db.query.wakuTemplate.findFirst({
        where: and(
          eq(wakuTemplate.userId, ctx.session.user.id),
          eq(wakuTemplate.slug, input.slug),
        ),
      });
      if (!tpl) throw new TRPCError({ code: "NOT_FOUND" });

      const versions = await ctx.db
        .select({
          id: wakuTemplateVersion.id,
          version: wakuTemplateVersion.version,
          publishedAt: wakuTemplateVersion.publishedAt,
          createdAt: wakuTemplateVersion.createdAt,
        })
        .from(wakuTemplateVersion)
        .where(eq(wakuTemplateVersion.templateId, tpl.id))
        .orderBy(desc(wakuTemplateVersion.version));

      return { ...tpl, versions };
    }),

  getVersion: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          version: wakuTemplateVersion,
          template: wakuTemplate,
        })
        .from(wakuTemplateVersion)
        .innerJoin(
          wakuTemplate,
          eq(wakuTemplate.id, wakuTemplateVersion.templateId),
        )
        .where(eq(wakuTemplateVersion.id, input.versionId))
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
        irJson: TemplateIRSchema,
        paramsSchemaJson: ParamsSchemaZ,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const existing = await tx.query.wakuTemplate.findFirst({
          where: and(
            eq(wakuTemplate.userId, ctx.session.user.id),
            eq(wakuTemplate.slug, input.slug),
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
          .insert(wakuTemplate)
          .values({
            userId: ctx.session.user.id,
            slug: input.slug,
            name: input.name,
          })
          .returning();
        if (!tpl) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const [version] = await tx
          .insert(wakuTemplateVersion)
          .values({
            templateId: tpl.id,
            version: 1,
            irJson: input.irJson,
            paramsSchemaJson: input.paramsSchemaJson,
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
            version: wakuTemplateVersion,
            template: wakuTemplate,
          })
          .from(wakuTemplateVersion)
          .innerJoin(
            wakuTemplate,
            eq(wakuTemplate.id, wakuTemplateVersion.templateId),
          )
          .where(eq(wakuTemplateVersion.id, input.versionId))
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
          .update(wakuTemplateVersion)
          .set({
            irJson: input.irJson,
            paramsSchemaJson: input.paramsSchemaJson,
          })
          .where(eq(wakuTemplateVersion.id, input.versionId))
          .returning();
        await tx
          .update(wakuTemplate)
          .set({ updatedAt: new Date() })
          .where(eq(wakuTemplate.id, row.template.id));
        return updated;
      });
    }),

  createVersion: protectedProcedure
    .input(
      z.object({ templateId: z.string().uuid() }).merge(draftInputSchema),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const tpl = await tx.query.wakuTemplate.findFirst({
          where: eq(wakuTemplate.id, input.templateId),
        });
        if (!tpl || tpl.userId !== ctx.session.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const latest = await tx
          .select({ v: sql<number>`MAX(${wakuTemplateVersion.version})` })
          .from(wakuTemplateVersion)
          .where(eq(wakuTemplateVersion.templateId, tpl.id));
        const nextVersion = (latest[0]?.v ?? 0) + 1;

        const [version] = await tx
          .insert(wakuTemplateVersion)
          .values({
            templateId: tpl.id,
            version: nextVersion,
            irJson: input.irJson,
            paramsSchemaJson: input.paramsSchemaJson,
          })
          .returning();
        await tx
          .update(wakuTemplate)
          .set({ updatedAt: new Date() })
          .where(eq(wakuTemplate.id, tpl.id));
        return version;
      });
    }),

  publish: protectedProcedure
    .input(z.object({ versionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.transaction(async (tx) => {
        const rows = await tx
          .select({
            version: wakuTemplateVersion,
            template: wakuTemplate,
          })
          .from(wakuTemplateVersion)
          .innerJoin(
            wakuTemplate,
            eq(wakuTemplate.id, wakuTemplateVersion.templateId),
          )
          .where(eq(wakuTemplateVersion.id, input.versionId))
          .limit(1);
        const row = rows[0];
        if (!row || row.template.userId !== ctx.session.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const now = new Date();
        const publishedAt = row.version.publishedAt ?? now;
        await tx
          .update(wakuTemplateVersion)
          .set({ publishedAt })
          .where(eq(wakuTemplateVersion.id, row.version.id));
        await tx
          .update(wakuTemplate)
          .set({ publishedVersionId: row.version.id, updatedAt: now })
          .where(eq(wakuTemplate.id, row.template.id));
        return { versionId: row.version.id, publishedAt };
      });
    }),

  delete: protectedProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tpl = await ctx.db.query.wakuTemplate.findFirst({
        where: eq(wakuTemplate.id, input.templateId),
        columns: { id: true, userId: true },
      });
      if (!tpl || tpl.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      // null out publishedVersionId first to drop the cycle from version FK constraint.
      await ctx.db
        .update(wakuTemplate)
        .set({ publishedVersionId: null })
        .where(eq(wakuTemplate.id, tpl.id));
      await ctx.db.delete(wakuTemplate).where(eq(wakuTemplate.id, tpl.id));
      return { ok: true as const };
    }),
});
