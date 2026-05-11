import { TRPCError } from "@trpc/server";
import { asc, desc, eq } from "drizzle-orm";
import { stockTemplate, templateCategory } from "@waku/db";
import { z } from "zod";

import { TemplateDocumentZ } from "@/components/template-editor/schema";
import { env } from "@/env";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import { storage } from "@/server/storage";

const slugSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase letters, digits, and dashes");

const tagsSchema = z.array(z.string().trim().min(1).max(40)).max(12);

// Thumbnails are produced by the render service (which owns resvg/sharp/satori
// native deps), then uploaded to R2 from here. Keeping the renderer out of the
// web bundle avoids turbopack tripping over @resvg native bindings.
const renderThumbnail = async (templateId: string, slug: string) => {
  const url = new URL(
    `/r/stock/${encodeURIComponent(slug)}`,
    env.NEXT_PUBLIC_RENDER_BASE_URL,
  );
  url.searchParams.set("format", "png");

  const png = await fetch(url, { cache: "no-store" });
  if (!png.ok) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `thumbnail render failed: ${png.status}`,
    });
  }
  const body = new Uint8Array(await png.arrayBuffer());

  const key = `stock-templates/${templateId}/thumb.png`;
  const instruction = await storage.getUploadUrl(key, "image/png");
  const res = await fetch(instruction.url, {
    method: instruction.method,
    headers: instruction.headers,
    body,
  });
  if (!res.ok) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `thumbnail upload failed: ${res.status}`,
    });
  }
  return key;
};

export const adminRouter = createTRPCRouter({
  // --- categories ---

  categoryList: adminProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(templateCategory)
      .orderBy(asc(templateCategory.sortOrder), asc(templateCategory.name)),
  ),

  categoryCreate: adminProcedure
    .input(
      z.object({
        slug: slugSchema,
        name: z.string().min(1).max(80),
        sortOrder: z.number().int().min(0).default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(templateCategory)
        .values(input)
        .returning();
      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return row;
    }),

  categoryUpdate: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        slug: slugSchema.optional(),
        name: z.string().min(1).max(80).optional(),
        sortOrder: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      const [row] = await ctx.db
        .update(templateCategory)
        .set(rest)
        .where(eq(templateCategory.id, id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  categoryDelete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(templateCategory)
        .where(eq(templateCategory.id, input.id));
      return { ok: true as const };
    }),

  // --- stock templates ---

  stockList: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: stockTemplate.id,
        slug: stockTemplate.slug,
        name: stockTemplate.name,
        description: stockTemplate.description,
        categoryId: stockTemplate.categoryId,
        tags: stockTemplate.tags,
        thumbnailKey: stockTemplate.thumbnailKey,
        publishedAt: stockTemplate.publishedAt,
        createdAt: stockTemplate.createdAt,
        updatedAt: stockTemplate.updatedAt,
      })
      .from(stockTemplate)
      .orderBy(desc(stockTemplate.updatedAt));
    return rows.map((r) => ({
      ...r,
      thumbnailUrl: r.thumbnailKey ? storage.getReadUrl(r.thumbnailKey) : null,
    }));
  }),

  stockGet: adminProcedure
    .input(z.object({ slug: slugSchema }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.db.query.stockTemplate.findFirst({
        where: eq(stockTemplate.slug, input.slug),
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  stockCreate: adminProcedure
    .input(
      z.object({
        slug: slugSchema,
        name: z.string().min(1).max(120),
        description: z.string().max(400).nullable().optional(),
        categoryId: z.string().uuid().nullable().optional(),
        tags: tagsSchema.optional(),
        documentJson: TemplateDocumentZ,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.stockTemplate.findFirst({
        where: eq(stockTemplate.slug, input.slug),
        columns: { id: true },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Stock template "${input.slug}" already exists`,
        });
      }
      const [row] = await ctx.db
        .insert(stockTemplate)
        .values({
          slug: input.slug,
          name: input.name,
          description: input.description ?? null,
          categoryId: input.categoryId ?? null,
          tags: input.tags ?? [],
          documentJson: input.documentJson,
          createdBy: ctx.session.user.id,
        })
        .returning();
      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return row;
    }),

  // Head-only: updates document and metadata in place. No snapshots.
  stockUpdate: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(120).optional(),
        description: z.string().max(400).nullable().optional(),
        categoryId: z.string().uuid().nullable().optional(),
        tags: tagsSchema.optional(),
        documentJson: TemplateDocumentZ.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      if (Object.keys(rest).length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "no fields to update",
        });
      }
      const [row] = await ctx.db
        .update(stockTemplate)
        .set({ ...rest, updatedAt: new Date() })
        .where(eq(stockTemplate.id, id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  // Renders a thumbnail from the current document, uploads to R2, and stamps
  // publishedAt. Callable repeatedly to refresh the thumbnail.
  stockPublish: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.stockTemplate.findFirst({
        where: eq(stockTemplate.id, input.id),
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      const key = await renderThumbnail(row.id, row.slug);
      const [updated] = await ctx.db
        .update(stockTemplate)
        .set({
          thumbnailKey: key,
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(stockTemplate.id, row.id))
        .returning();
      return updated;
    }),

  stockUnpublish: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(stockTemplate)
        .set({ publishedAt: null, updatedAt: new Date() })
        .where(eq(stockTemplate.id, input.id))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  stockDelete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(stockTemplate).where(eq(stockTemplate.id, input.id));
      return { ok: true as const };
    }),
});
