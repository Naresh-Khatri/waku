"use client";

import { useMemo, type MouseEvent } from "react";
import { useRouter } from "next/navigation";

import { TemplateCard } from "@/components/templates/template-card";
import type { TemplateDocument } from "@/components/template-editor/types";
import { api } from "@/trpc/react";

type StockItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tags: string[];
  thumbnailUrl: string | null;
  documentJson: TemplateDocument | null;
  category: { id: string; slug: string; name: string } | null;
};

export function Catalogue() {
  const router = useRouter();
  const stockQuery = api.template.listStock.useQuery();
  const forkMutation = api.template.forkFromStock.useMutation();

  const handleOpenTemplate = async (
    e: MouseEvent<HTMLAnchorElement>,
    stockSlug: string,
  ) => {
    e.preventDefault();
    if (forkMutation.isPending) return;
    try {
      const { template } = await forkMutation.mutateAsync({ stockSlug });
      router.push(`/templates/${template.slug}`);
    } catch {
      router.push(`/t/${stockSlug}?fork=1`);
    }
  };

  const grouped = useMemo(() => {
    const data: StockItem[] = stockQuery.data ?? [];
    const groups = new Map<string, { name: string; items: StockItem[] }>();
    for (const item of data) {
      const key = item.category?.slug ?? "__uncategorized";
      const name = item.category?.name ?? "Uncategorized";
      if (!groups.has(key)) groups.set(key, { name, items: [] });
      groups.get(key)!.items.push(item);
    }
    return Array.from(groups.entries()).map(([slug, g]) => ({
      slug,
      name: g.name,
      items: g.items,
    }));
  }, [stockQuery.data]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-[#e5e7eb]">Templates</h2>
        <p className="mt-1 text-sm text-[#9ca3af]">
          Open a template to jump straight into editing. Your own copy is forked
          automatically.
        </p>
      </div>

      {stockQuery.isLoading ? (
        <div className="text-sm text-[#9ca3af]">Loading…</div>
      ) : grouped.length === 0 ? (
        <div className="rounded-md border border-[#1f2937] bg-[#0b0f1a] px-4 py-6 text-sm text-[#9ca3af]">
          No templates yet. Admins can publish stock templates from{" "}
          <code className="rounded bg-[#1f2937] px-1.5 py-0.5 text-xs">
            /admin
          </code>
          .
        </div>
      ) : (
        grouped.map((group) => (
          <section key={group.slug} className="flex flex-col gap-3">
            <h3 className="text-sm font-medium uppercase tracking-wide text-[#9ca3af]">
              {group.name}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => (
                <TemplateCard
                  key={item.id}
                  href={`/t/${item.slug}?fork=1`}
                  onClick={(e) => void handleOpenTemplate(e, item.slug)}
                  prefetch={false}
                  name={item.name}
                  description={item.description}
                  tags={item.tags}
                  thumbnailUrl={item.thumbnailUrl}
                  document={item.documentJson ?? undefined}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
