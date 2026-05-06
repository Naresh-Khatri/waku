import { wakuCreditLedger } from "@waku/db";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { CREDIT_COSTS, getBalance } from "@/server/billing/credits";

export const creditsRouter = createTRPCRouter({
  balance: protectedProcedure.query(async ({ ctx }) => {
    const balance = await getBalance(ctx.session.user.id);
    return { balance, costs: CREDIT_COSTS };
  }),

  history: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: wakuCreditLedger.id,
          delta: wakuCreditLedger.delta,
          reason: wakuCreditLedger.reason,
          balanceAfter: wakuCreditLedger.balanceAfter,
          createdAt: wakuCreditLedger.createdAt,
        })
        .from(wakuCreditLedger)
        .where(eq(wakuCreditLedger.userId, ctx.session.user.id))
        .orderBy(desc(wakuCreditLedger.createdAt))
        .limit(input.limit);
      return rows;
    }),
});
