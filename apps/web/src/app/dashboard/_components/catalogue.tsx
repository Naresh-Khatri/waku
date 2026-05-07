"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/trpc/react";

import { SEED_TEMPLATES, type SeedTemplate } from "./seed-templates";
import { TemplatePreview } from "./template-preview";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56) || "untitled";

export function Catalogue() {
  const router = useRouter();
  const utils = api.useUtils();
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

  const onFork = (seed: SeedTemplate) => {
    if (create.isPending) return;
    setError(null);
    setPendingId(seed.id);
    const stamp = Date.now().toString(36).slice(-4);
    create.mutate({
      slug: `${slugify(seed.name)}-${stamp}`,
      name: seed.name,
      documentJson: seed.document,
    });
  };

  return (
    <div className="flex flex-col gap-5">
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SEED_TEMPLATES.map((seed) => (
          <CatalogueCard
            key={seed.id}
            seed={seed}
            pending={pendingId === seed.id && create.isPending}
            disabled={create.isPending}
            onFork={() => onFork(seed)}
          />
        ))}
      </div>
    </div>
  );
}

function CatalogueCard({
  seed,
  pending,
  disabled,
  onFork,
}: {
  seed: SeedTemplate;
  pending: boolean;
  disabled: boolean;
  onFork: () => void;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[#1f2937] bg-[#0b0f1a] transition hover:border-[#374151]">
      <div className="border-b border-[#1f2937]">
        <TemplatePreview document={seed.document} />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-base font-medium text-[#e5e7eb]">{seed.name}</h3>
          <p className="mt-1 text-xs text-[#9ca3af]">{seed.description}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {seed.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#1f2937] px-2 py-0.5 text-[10px] text-[#9ca3af]"
            >
              {tag}
            </span>
          ))}
        </div>
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

