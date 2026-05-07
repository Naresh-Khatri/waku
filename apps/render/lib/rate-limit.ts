import "server-only";

import { env } from "@/env";

const FREE_DAILY_LIMIT = env.WAKU_FREE_DAILY_LIMIT;
const WINDOW_MS = 24 * 60 * 60 * 1000;

type Bucket = { count: number; resetAt: number };

const globalForLimiter = globalThis as unknown as {
  wakuLimiter?: Map<string, Bucket>;
};
const buckets = (globalForLimiter.wakuLimiter ??= new Map<string, Bucket>());

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
};

export const checkRateLimit = (key: string): RateLimitResult => {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(key, fresh);
    return {
      ok: true,
      remaining: FREE_DAILY_LIMIT - 1,
      resetAt: fresh.resetAt,
      limit: FREE_DAILY_LIMIT,
    };
  }
  if (existing.count >= FREE_DAILY_LIMIT) {
    return {
      ok: false,
      remaining: 0,
      resetAt: existing.resetAt,
      limit: FREE_DAILY_LIMIT,
    };
  }
  existing.count += 1;
  return {
    ok: true,
    remaining: FREE_DAILY_LIMIT - existing.count,
    resetAt: existing.resetAt,
    limit: FREE_DAILY_LIMIT,
  };
};

export const getClientIp = (req: Request): string => {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
};
