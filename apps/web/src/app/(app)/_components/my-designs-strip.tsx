"use client";

import Link from "next/link";

import { api } from "@/trpc/react";

const STRIP_LIMIT = 3;

export function MyDesignsStrip() {
  const query = api.template.listMine.useQuery({ limit: STRIP_LIMIT });

  if (query.isLoading) return null;
  const items = query.data?.items ?? [];
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between">
        <h2 className="text-xl font-semibold text-[#e5e7eb]">Your designs</h2>
        <Link
          href="/designs"
          className="text-sm text-[#9ca3af] hover:text-[#e5e7eb]"
        >
          View all →
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {items.map((t) => (
          <li key={t.id}>
            <Link
              href={`/templates/${t.slug}`}
              className="flex flex-col gap-1.5 rounded-xl border border-[#1f2937] bg-[#0b0f1a] p-4 transition hover:border-[#7c5cff]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="line-clamp-2 text-sm font-semibold text-[#e5e7eb]">
                  {t.name}
                </span>
                {t.publishedVersionId ? (
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#6ee7b7]"
                    title="Published"
                  />
                ) : null}
              </div>
              <span className="truncate font-mono text-[10px] text-[#6b7280]">
                {t.slug}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
