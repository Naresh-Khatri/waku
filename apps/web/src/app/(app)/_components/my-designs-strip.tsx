"use client";

import Link from "next/link";

import { TemplateCard } from "@/components/templates/template-card";
import { TemplateCardSkeleton } from "@/components/templates/template-card-skeleton";
import { api } from "@/trpc/react";

const STRIP_LIMIT = 3;
const SKELETON_COUNT = 4;

export function MyDesignsStrip() {
  const query = api.template.listMine.useQuery({ limit: STRIP_LIMIT });

  if (!query.isLoading) {
    const items = query.data?.items ?? [];
    if (items.length === 0) return null;
  }

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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {query.isLoading
          ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <TemplateCardSkeleton key={i} />
            ))
          : (query.data?.items ?? []).map((t) => (
              <TemplateCard
                key={t.id}
                href={`/templates/${t.slug}`}
                name={t.name}
                thumbnailUrl={t.thumbnailUrl}
              />
            ))}
      </div>
    </section>
  );
}
