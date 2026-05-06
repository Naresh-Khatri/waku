import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { wakuAsset } from "@waku/db";
import { z } from "zod";

import { storage } from "@/server/storage";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const ALLOWED_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
] as const;

const KIND = ["image", "logo", "background"] as const;

const filenameSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9._-]+$/, "letters, digits, dot, dash, underscore only");

const extFromMime = (mime: string): string => {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/svg+xml":
      return "svg";
    default:
      return "bin";
  }
};

export const assetRouter = createTRPCRouter({
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        kind: z.enum(KIND),
        filename: filenameSchema,
        mime: z.enum(ALLOWED_MIME),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const assetId = crypto.randomUUID();
      const ext = extFromMime(input.mime);
      const storageKey = `assets/${userId}/${assetId}.${ext}`;
      const upload = await storage.getUploadUrl(storageKey, input.mime);
      return {
        assetId,
        storageKey,
        upload,
      };
    }),

  confirm: protectedProcedure
    .input(
      z.object({
        assetId: z.string().uuid(),
        storageKey: z.string().min(1),
        kind: z.enum(KIND),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const expectedPrefix = `assets/${userId}/`;
      if (!input.storageKey.startsWith(expectedPrefix)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "storage key does not belong to this user",
        });
      }

      const head = await storage.head(input.storageKey);
      if (!head) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "upload not found in storage",
        });
      }

      const [row] = await ctx.db
        .insert(wakuAsset)
        .values({
          id: input.assetId,
          userId,
          kind: input.kind,
          storageKey: input.storageKey,
          mime: head.mime,
          bytes: head.bytes,
        })
        .returning();
      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return { ...row, readUrl: storage.getReadUrl(row.storageKey) };
    }),

  list: protectedProcedure
    .input(z.object({ kind: z.enum(KIND).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const where =
        input?.kind === undefined
          ? eq(wakuAsset.userId, userId)
          : and(eq(wakuAsset.userId, userId), eq(wakuAsset.kind, input.kind));
      const rows = await ctx.db
        .select()
        .from(wakuAsset)
        .where(where)
        .orderBy(desc(wakuAsset.createdAt));
      return rows.map((r) => ({ ...r, readUrl: storage.getReadUrl(r.storageKey) }));
    }),
});
