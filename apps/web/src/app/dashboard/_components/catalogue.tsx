"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { TemplateDocument } from "@/components/template-editor/types";
import { api } from "@/trpc/react";

import { TemplatePreview } from "./template-preview";

type StockItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tags: string[];
  thumbnailUrl: string | null;
  documentJson: TemplateDocument;
  category: { id: string; slug: string; name: string } | null;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56) || "untitled";

export function Catalogue() {
  const router = useRouter();
  const utils = api.useUtils();
  const stockQuery = api.template.listStock.useQuery();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = api.template.create.useMutation({
    onSuccess: async ({ template }) => {
      await utils.template.list.invalidate();
      router.push(`/dashboard/templates/${template.slug}/edit`);
    },
    onError: (err) => {
      setError(err.message);
      setPendingId(null);
    },
  });

  const onFork = (item: StockItem) => {
    if (create.isPending) return;
    setError(null);
    setPendingId(item.id);
    const stamp = Date.now().toString(36).slice(-4);
    create.mutate({
      slug: `${slugify(item.name)}-${stamp}`,
      name: item.name,
      documentJson: item.documentJson,
    });
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
        <h2 className="text-xl font-semibold text-[#e5e7eb]">
          Designs catalogue
        </h2>
        <p className="mt-1 text-sm text-[#9ca3af]">
          Fork a starter into your designs and customize it in the editor.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-[#7f1d1d] bg-[#1f0a0a] px-3 py-2 text-sm text-[#fca5a5]">
          {error}
        </div>
      ) : null}

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
            <h3 className="text-sm font-medium tracking-wide text-[#9ca3af] uppercase">
              {group.name}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {group.items.map((item) => (
                <CatalogueCard
                  key={item.id}
                  item={item}
                  pending={pendingId === item.id && create.isPending}
                  disabled={create.isPending}
                  onFork={() => onFork(item)}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function CatalogueCard({
  item,
  pending,
  disabled,
  onFork,
}: {
  item: StockItem;
  pending: boolean;
  disabled: boolean;
  onFork: () => void;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[#1f2937] bg-[#0b0f1a] transition hover:border-[#374151]">
      <div className="border-b border-[#1f2937]">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt={item.name}
            className="aspect-[40/21] w-full object-cover"
            loading="lazy"
          />
        ) : (
          <TemplatePreview document={item.documentJson} />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-base font-medium text-[#e5e7eb]">{item.name}</h3>
          {item.description ? (
            <p className="mt-1 text-xs text-[#9ca3af]">{item.description}</p>
          ) : null}
        </div>
        {item.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[#1f2937] px-2 py-0.5 text-[10px] text-[#9ca3af]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <button
          type="button"
          onClick={onFork}
          disabled={disabled}
          className="mt-1 rounded-md bg-[#7c5cff] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#6b4be0] disabled:opacity-40"
        >
          {pending ? "Forking…" : "Fork & edit"}
        </button>
      </div>
    </div>
  );
}
