"use client";

import Link from "next/link";
import { useState } from "react";

import { api } from "@/trpc/react";

export function StockTemplatesTable() {
  const utils = api.useUtils();
  const list = api.admin.stockList.useQuery();
  const categories = api.admin.categoryList.useQuery();

  const publish = api.admin.stockPublish.useMutation({
    onSettled: () => {
      void utils.admin.stockList.invalidate();
    },
  });
  const unpublish = api.admin.stockUnpublish.useMutation({
    onSettled: () => {
      void utils.admin.stockList.invalidate();
    },
  });
  const del = api.admin.stockDelete.useMutation({
    onSettled: () => {
      void utils.admin.stockList.invalidate();
    },
  });

  const [busyId, setBusyId] = useState<string | null>(null);
  const categoryName = (id: string | null) =>
    id ? (categories.data?.find((c) => c.id === id)?.name ?? "—") : "—";

  if (list.isLoading) {
    return <div className="text-sm text-[#9ca3af]">Loading…</div>;
  }
  const rows = list.data ?? [];
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-[#1f2937] bg-[#0b0f1a] px-4 py-6 text-sm text-[#9ca3af]">
        No stock templates yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#1f2937]">
      <table className="w-full text-sm">
        <thead className="bg-[#0b0f1a] text-left text-xs tracking-wide text-[#9ca3af] uppercase">
          <tr>
            <th className="w-24 px-4 py-3 font-medium">Preview</th>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Slug</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1f2937] bg-[#030712]">
          {rows.map((r) => {
            const isBusy = busyId === r.id;
            return (
              <tr key={r.id} className="hover:bg-[#0b0f1a]">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/templates/${r.slug}/edit`}
                    className="block aspect-[16/9] w-20 overflow-hidden rounded border border-[#1f2937] bg-[#0b0f1a]"
                  >
                    {r.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.thumbnailUrl}
                        alt={r.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-[#6b7280]">
                        no preview
                      </div>
                    )}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/templates/${r.slug}/edit`}
                    className="text-[#e5e7eb] hover:text-[#a78bfa]"
                  >
                    {r.name}
                  </Link>
                  {r.description ? (
                    <div className="mt-0.5 text-xs text-[#6b7280]">
                      {r.description}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-[#9ca3af]">
                  {r.slug}
                </td>
                <td className="px-4 py-3 text-[#d1d5db]">
                  {categoryName(r.categoryId)}
                </td>
                <td className="px-4 py-3">
                  {r.publishedAt ? (
                    <span className="rounded-full bg-emerald-900/30 px-2 py-0.5 text-[10px] text-emerald-300">
                      published
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-[#9ca3af]">
                      draft
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2 text-xs">
                    <Link
                      href={`/admin/templates/${r.slug}/edit`}
                      className="rounded-md border border-[#1f2937] px-2 py-1 hover:border-[#374151]"
                    >
                      Edit
                    </Link>
                    {r.publishedAt ? (
                      <button
                        disabled={isBusy}
                        onClick={() => {
                          setBusyId(r.id);
                          unpublish.mutate(
                            { id: r.id },
                            { onSettled: () => setBusyId(null) },
                          );
                        }}
                        className="rounded-md border border-[#1f2937] px-2 py-1 hover:border-[#374151] disabled:opacity-40"
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        disabled={isBusy}
                        onClick={() => {
                          setBusyId(r.id);
                          publish.mutate(
                            { id: r.id },
                            { onSettled: () => setBusyId(null) },
                          );
                        }}
                        className="rounded-md bg-[#7c5cff] px-2 py-1 text-white hover:bg-[#6b4be0] disabled:opacity-40"
                      >
                        Publish
                      </button>
                    )}
                    <button
                      disabled={isBusy}
                      onClick={() => {
                        if (!confirm(`Delete "${r.name}"?`)) return;
                        setBusyId(r.id);
                        del.mutate(
                          { id: r.id },
                          { onSettled: () => setBusyId(null) },
                        );
                      }}
                      className="rounded-md border border-rose-900/60 px-2 py-1 text-rose-300 hover:border-rose-700 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
