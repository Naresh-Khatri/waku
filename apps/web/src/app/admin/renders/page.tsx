import Link from "next/link";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import {
  renderLog,
  template,
  templateVersion,
  user,
} from "@waku/db";

import { db } from "@/server/db";

const PAGE_SIZE = 100;
const DAY_MS = 24 * 60 * 60 * 1000;

type SearchParams = Promise<{ errors?: string }>;

export default async function AdminRendersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const errorsOnly = sp.errors === "1";

  const since = new Date(Date.now() - DAY_MS);

  const errorPredicate = sql`${renderLog.status} >= 400`;
  const whereClause = errorsOnly ? errorPredicate : undefined;

  const [totals, errors, latency, rows] = await Promise.all([
    db.select({ n: count() }).from(renderLog).where(gte(renderLog.createdAt, since)),
    db
      .select({ n: count() })
      .from(renderLog)
      .where(and(gte(renderLog.createdAt, since), errorPredicate)),
    db
      .select({
        avg: sql<number>`coalesce(avg(${renderLog.ms}), 0)::int`,
        p95: sql<number>`coalesce(percentile_cont(0.95) within group (order by ${renderLog.ms}), 0)::int`,
      })
      .from(renderLog)
      .where(gte(renderLog.createdAt, since)),
    db
      .select({
        id: renderLog.id,
        createdAt: renderLog.createdAt,
        status: renderLog.status,
        ms: renderLog.ms,
        format: renderLog.format,
        paramsHash: renderLog.paramsHash,
        error: renderLog.error,
        templateVersionId: renderLog.templateVersionId,
        version: templateVersion.version,
        templateId: template.id,
        templateSlug: template.slug,
        templateName: template.name,
        userHandle: sql<string | null>`${user.name}`,
      })
      .from(renderLog)
      .leftJoin(
        templateVersion,
        eq(templateVersion.id, renderLog.templateVersionId),
      )
      .leftJoin(template, eq(template.id, templateVersion.templateId))
      .leftJoin(user, eq(user.id, renderLog.userId))
      .where(whereClause)
      .orderBy(desc(renderLog.createdAt))
      .limit(PAGE_SIZE),
  ]);

  const total24h = totals[0]?.n ?? 0;
  const errors24h = errors[0]?.n ?? 0;
  const errorRate =
    total24h > 0 ? ((errors24h / total24h) * 100).toFixed(1) : "0.0";
  const avgMs = latency[0]?.avg ?? 0;
  const p95Ms = latency[0]?.p95 ?? 0;

  const stats = [
    { label: "Renders (24h)", value: total24h.toLocaleString() },
    {
      label: "Errors (24h)",
      value: `${errors24h.toLocaleString()} (${errorRate}%)`,
      bad: errors24h > 0,
    },
    { label: "Avg latency", value: `${avgMs} ms` },
    { label: "p95 latency", value: `${p95Ms} ms` },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Render logs</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Recent renders served by the render service. Last 24h stats; latest{" "}
            {PAGE_SIZE} rows below.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Link
            href="/admin/renders"
            className={`rounded-md border px-3 py-1.5 ${
              errorsOnly
                ? "border-[#1f2937] text-[#9ca3af] hover:border-[#374151]"
                : "border-[#7c5cff] text-[#a78bfa]"
            }`}
          >
            All
          </Link>
          <Link
            href="/admin/renders?errors=1"
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

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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
            ? "No render errors recorded."
            : "No renders recorded yet."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#1f2937]">
          <table className="w-full text-sm">
            <thead className="bg-[#0b0f1a] text-left text-xs tracking-wide text-[#9ca3af] uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Template</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Version</th>
                <th className="px-4 py-3 font-medium">Format</th>
                <th className="px-4 py-3 text-right font-medium">Latency</th>
                <th className="px-4 py-3 text-right font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2937] bg-[#030712]">
              {rows.map((r) => {
                const isError = r.status >= 400;
                const slow = r.ms >= 2000;
                return (
                  <tr key={r.id} className="hover:bg-[#0b0f1a]">
                    <td
                      className="px-4 py-3 text-xs whitespace-nowrap text-[#9ca3af]"
                      title={r.createdAt.toISOString()}
                    >
                      {formatTime(r.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {r.templateSlug ? (
                        <div>
                          <div className="text-[#e5e7eb]">
                            {r.templateName ?? r.templateSlug}
                          </div>
                          <div className="font-mono text-[10px] text-[#6b7280]">
                            {r.templateSlug}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#6b7280]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#d1d5db]">
                      {r.userHandle ?? (
                        <span className="text-[#6b7280]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#9ca3af]">
                      {r.version ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#9ca3af] uppercase">
                      {r.format}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono text-xs ${
                        slow ? "text-amber-300" : "text-[#d1d5db]"
                      }`}
                    >
                      {r.ms} ms
                    </td>
                    <td className="px-4 py-3 text-right">
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
