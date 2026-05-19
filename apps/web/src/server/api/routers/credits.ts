import { creditLedger } from "@waku/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { CREDIT_COSTS, getBalance } from "@/server/billing/credits";

export const creditsRouter = createTRPCRouter({
  balance: protectedProcedure.query(async ({ ctx }) => {
    const balance = await getBalance(
      ctx.session.user.id,
      ctx.session.user.isAnonymous ?? false,
    );
    return { balance, costs: CREDIT_COSTS };
  }),

  history: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: creditLedger.id,
          delta: creditLedger.delta,
          reason: creditLedger.reason,
          balanceAfter: creditLedger.balanceAfter,
          createdAt: creditLedger.createdAt,
        })
        .from(creditLedger)
        .where(eq(creditLedger.userId, ctx.session.user.id))
        .orderBy(desc(creditLedger.createdAt))
        .limit(input.limit);
      return rows;
    }),
});
