// Next.js calls register() once per server instance on startup. App is
// Node-only (no edge runtime), so import the cron module directly — it
// pulls in server-only deps and boots the in-process scheduler on import.
export async function register(): Promise<void> {
  await import("@/server/cron");
}
