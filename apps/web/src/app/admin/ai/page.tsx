import Link from "next/link";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { aiGeneration, user } from "@waku/db";

import { db } from "@/server/db";

const PAGE_SIZE = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

type SearchParams = Promise<{ errors?: string }>;

export default async function AdminAiPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const errorsOnly = sp.errors === "1";

  const since = new Date(Date.now() - DAY_MS);
  const errorPredicate = eq(aiGeneration.status, "error");
  const whereClause = errorsOnly ? errorPredicate : undefined;

  const [totals, errors, latency, credits, rows] = await Promise.all([
    db
      .select({ n: count() })
      .from(aiGeneration)
      .where(gte(aiGeneration.createdAt, since)),
    db
      .select({ n: count() })
      .from(aiGeneration)
      .where(and(gte(aiGeneration.createdAt, since), errorPredicate)),
    db
      .select({
        avg: sql<number>`coalesce(avg(${aiGeneration.ms}), 0)::int`,
        p95: sql<number>`coalesce(percentile_cont(0.95) within group (order by ${aiGeneration.ms}), 0)::int`,
      })
      .from(aiGeneration)
      .where(gte(aiGeneration.createdAt, since)),
    db
      .select({
        total: sql<number>`coalesce(sum(${aiGeneration.creditsCharged}), 0)::int`,
      })
      .from(aiGeneration)
      .where(gte(aiGeneration.createdAt, since)),
    db
      .select({
        id: aiGeneration.id,
        createdAt: aiGeneration.createdAt,
        kind: aiGeneration.kind,
        prompt: aiGeneration.prompt,
        status: aiGeneration.status,
        error: aiGeneration.error,
        ms: aiGeneration.ms,
        creditsCharged: aiGeneration.creditsCharged,
        userName: user.name,
      })
      .from(aiGeneration)
      .leftJoin(user, eq(user.id, aiGeneration.userId))
      .where(whereClause)
      .orderBy(desc(aiGeneration.createdAt))
      .limit(PAGE_SIZE),
  ]);

  const total24h = totals[0]?.n ?? 0;
  const errors24h = errors[0]?.n ?? 0;
  const errorRate =
    total24h > 0 ? ((errors24h / total24h) * 100).toFixed(1) : "0.0";
  const avgMs = latency[0]?.avg ?? 0;
  const p95Ms = latency[0]?.p95 ?? 0;
  const credits24h = credits[0]?.total ?? 0;

  const stats = [
    { label: "Generations (24h)", value: total24h.toLocaleString() },
    {
      label: "Errors (24h)",
      value: `${errors24h.toLocaleString()} (${errorRate}%)`,
      bad: errors24h > 0,
    },
    { label: "Avg latency", value: `${avgMs} ms` },
    { label: "p95 latency", value: `${p95Ms} ms` },
    { label: "Credits (24h)", value: credits24h.toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">AI generations</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Every call to the AI design tool. Last 24h stats; latest{" "}
            {PAGE_SIZE} rows below.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Link
            href="/admin/ai"
            className={`rounded-md border px-3 py-1.5 ${
              errorsOnly
                ? "border-[#1f2937] text-[#9ca3af] hover:border-[#374151]"
                : "border-[#7c5cff] text-[#a78bfa]"
            }`}
          >
            All
          </Link>
          <Link
            href="/admin/ai?errors=1"
            className={`rounded-md border px-3 py-1.5 ${
              errorsOnly
                ? "border-rose-700 text-rose-300"
                : "border-[#1f2937] text-[#9ca3af] hover:border-[#374151]"
            }`}
          >
            Errors only
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-[#1f2937] bg-[#0b0f1a] p-5"
          >
            <div className="text-xs tracking-wide text-[#9ca3af] uppercase">
              {s.label}
            </div>
            <div
              className={`mt-2 text-2xl font-semibold ${
                s.bad ? "text-rose-300" : ""
              }`}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-[#1f2937] bg-[#0b0f1a] px-4 py-6 text-sm text-[#9ca3af]">
          {errorsOnly
            ? "No AI errors recorded."
            : "No AI generations recorded yet."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#1f2937]">
          <table className="w-full text-sm">
            <thead className="bg-[#0b0f1a] text-left text-xs tracking-wide text-[#9ca3af] uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Kind</th>
                <th className="px-4 py-3 font-medium">Prompt</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Latency</th>
                <th className="px-4 py-3 text-right font-medium">Credits</th>
                <th className="px-4 py-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2937] bg-[#030712]">
              {rows.map((r) => {
                const isError = r.status === "error";
                const slow = (r.ms ?? 0) >= 10_000;
                return (
                  <tr key={r.id} className="hover:bg-[#0b0f1a] align-top">
                    <td
                      className="px-4 py-3 text-xs whitespace-nowrap text-[#9ca3af]"
                      title={r.createdAt.toISOString()}
                    >
                      {formatTime(r.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-[#d1d5db]">
                      {r.userName ?? (
                        <span className="text-[#6b7280]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#9ca3af]">
                      {r.kind}
                    </td>
                    <td className="max-w-[360px] truncate px-4 py-3 text-[#d1d5db]">
                      <span title={r.prompt}>
                        {r.prompt || (
                          <span className="text-[#6b7280]">—</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${
                          isError
                            ? "bg-rose-900/40 text-rose-300"
                            : "bg-emerald-900/30 text-emerald-300"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono text-xs ${
                        slow ? "text-amber-300" : "text-[#d1d5db]"
                      }`}
                    >
                      {r.ms !== null ? `${r.ms} ms` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#d1d5db]">
                      {r.creditsCharged}
                    </td>
                    <td className="max-w-[280px] truncate px-4 py-3 font-mono text-xs text-rose-300">
                      {r.error ? (
                        <span title={r.error}>{r.error}</span>
                      ) : (
                        <span className="text-[#6b7280]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatTime(d: Date) {
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toISOString().replace("T", " ").slice(0, 16);
}
