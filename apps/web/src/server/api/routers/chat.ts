import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { chatConversation, chatMessage } from "@waku/db";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const chatRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: chatConversation.id,
        title: chatConversation.title,
        createdAt: chatConversation.createdAt,
        updatedAt: chatConversation.updatedAt,
      })
      .from(chatConversation)
      .where(eq(chatConversation.userId, ctx.session.user.id))
      .orderBy(desc(chatConversation.updatedAt))
      .limit(50);
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const convo = await ctx.db.query.chatConversation.findFirst({
        where: and(
          eq(chatConversation.id, input.id),
          eq(chatConversation.userId, ctx.session.user.id),
        ),
      });
      if (!convo) throw new TRPCError({ code: "NOT_FOUND" });

      const messages = await ctx.db
        .select({
          id: chatMessage.id,
          role: chatMessage.role,
          parts: chatMessage.parts,
          createdAt: chatMessage.createdAt,
        })
        .from(chatMessage)
        .where(eq(chatMessage.conversationId, convo.id))
        .orderBy(asc(chatMessage.createdAt));

      return { ...convo, messages };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const convo = await ctx.db.query.chatConversation.findFirst({
        where: eq(chatConversation.id, input.id),
        columns: { id: true, userId: true },
      });
      if (!convo || convo.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await ctx.db
        .delete(chatConversation)
        .where(eq(chatConversation.id, convo.id));
      return { ok: true as const };
    }),
});
