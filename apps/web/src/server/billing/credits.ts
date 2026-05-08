import "server-only";

import { creditBalance, creditLedger } from "@waku/db";
import { sql, eq } from "drizzle-orm";

import { db } from "@/server/db";

export const FREE_STARTER_CREDITS = 25;

export const CREDIT_COSTS = {
  pickTemplate: 1,
  remixTheme: 2,
  generateCopy: 1,
  generateBackground: 10,
} as const;

export type CreditReason =
  | "topup"
  | "starter"
  | "ai.template_pick"
  | "ai.theme_remix"
  | "ai.bg_gen"
  | "ai.copy"
  | "refund";

export async function ensureBalanceRow(userId: string): Promise<number> {
  const existing = await db
    .select({ balance: creditBalance.balance })
    .from(creditBalance)
    .where(eq(creditBalance.userId, userId))
    .limit(1);
  if (existing[0]) return existing[0].balance;

  return db.transaction(async (tx) => {
    await tx
      .insert(creditBalance)
      .values({ userId, balance: FREE_STARTER_CREDITS })
      .onConflictDoNothing();
    await tx.insert(creditLedger).values({
      userId,
      delta: FREE_STARTER_CREDITS,
      reason: "starter",
      balanceAfter: FREE_STARTER_CREDITS,
    });
    return FREE_STARTER_CREDITS;
  });
}

export async function getBalance(userId: string): Promise<number> {
  return ensureBalanceRow(userId);
}

export type ChargeResult =
  | { ok: true; balanceAfter: number }
  | { ok: false; balance: number; needed: number };

export async function chargeCredits(
  userId: string,
  amount: number,
  reason: CreditReason,
  refId?: string,
): Promise<ChargeResult> {
  if (amount <= 0) throw new Error("amount must be positive");
  await ensureBalanceRow(userId);
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(creditBalance)
      .set({
        balance: sql`${creditBalance.balance} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(
        sql`${creditBalance.userId} = ${userId} AND ${creditBalance.balance} >= ${amount}`,
      )
      .returning({ balance: creditBalance.balance });
    const row = updated[0];
    if (!row) {
      const cur = await tx
        .select({ balance: creditBalance.balance })
        .from(creditBalance)
        .where(eq(creditBalance.userId, userId))
        .limit(1);
      return {
        ok: false as const,
        balance: cur[0]?.balance ?? 0,
        needed: amount,
      };
    }
    await tx.insert(creditLedger).values({
      userId,
      delta: -amount,
      reason,
      refId,
      balanceAfter: row.balance,
    });
    return { ok: true as const, balanceAfter: row.balance };
  });
}

export async function refundCredits(
  userId: string,
  amount: number,
  refId?: string,
): Promise<number> {
  if (amount <= 0) throw new Error("amount must be positive");
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(creditBalance)
      .set({
        balance: sql`${creditBalance.balance} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(creditBalance.userId, userId))
      .returning({ balance: creditBalance.balance });
    const row = updated[0];
    if (!row) throw new Error("balance row missing during refund");
    await tx.insert(creditLedger).values({
      userId,
      delta: amount,
      reason: "refund",
      refId,
      balanceAfter: row.balance,
    });
    return row.balance;
  });
}
