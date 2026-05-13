"use client";

import { TemplateCard } from "@/components/templates/template-card";
import { api } from "@/trpc/react";

const PAGE_SIZE = 24;

export function DesignsList() {
  const query = api.template.listMine.useInfiniteQuery(
    { limit: PAGE_SIZE },
    { getNextPageParam: (last) => last.nextCursor ?? undefined },
  );

  if (query.isLoading) {
    return <p className="text-sm text-[#9ca3af]">Loading…</p>;
  }
  if (query.error) {
    return (
      <p className="text-sm text-rose-400">
        Failed to load designs: {query.error.message}
      </p>
    );
  }

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#1f2937] bg-[#0b0f1a] px-6 py-12 text-center">
        <p className="text-sm text-[#9ca3af]">
          No designs yet — pick a template or describe what you want from the
          dashboard.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <TemplateCard
            key={t.id}
            href={`/templates/${t.slug}`}
            name={t.name}
            description={`Updated ${formatRelative(t.updatedAt)}`}
            thumbnailUrl={t.thumbnailUrl}
          />
        ))}
      </div>
      {query.hasNextPage ? (
        <button
          type="button"
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          className="mx-auto rounded-md border border-[#1f2937] px-4 py-2 text-sm text-[#e5e7eb] transition hover:bg-[#1f2937] disabled:opacity-50"
        >
          {query.isFetchingNextPage ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </>
  );
}

function formatRelative(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const ms = Date.now() - date.getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
