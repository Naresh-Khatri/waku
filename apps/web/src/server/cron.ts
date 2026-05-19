import "server-only";

import { CronJob } from "cron";

import { runAnonCleanup } from "@/server/better-auth/anon-cleanup";

// Self-hosted, in-process scheduler — no external cron service. Booted once
// from instrumentation.ts on server startup. The `register()` hook can fire
// more than once (dev HMR); a global guard makes the schedule idempotent so
// we never stack duplicate jobs in one process.
const GUARD = Symbol.for("waku.cron.started");
type GuardedGlobal = typeof globalThis & { [GUARD]?: true };

// 03:00 UTC daily. `waitForCompletion` makes cron skip a tick while the
// previous run is still going, so a slow reap can't overlap itself.
const ANON_CLEANUP_CRON = "0 3 * * *";

export function startCron(): void {
  const g = globalThis as GuardedGlobal;
  if (g[GUARD]) return;
  g[GUARD] = true;

  CronJob.from({
    cronTime: ANON_CLEANUP_CRON,
    timeZone: "UTC",
    start: true,
    waitForCompletion: true,
    name: "anon-cleanup",
    onTick: async () => {
      try {
        const result = await runAnonCleanup();
        console.info("[cron] anon-cleanup ok", result);
      } catch (error) {
        // Swallow: the next tick retries, and migrateAnonData is idempotent.
        console.error("[cron] anon-cleanup failed", error);
      }
    },
  });

  console.info(`[cron] anon-cleanup scheduled (${ANON_CLEANUP_CRON} UTC)`);
}

startCron();
