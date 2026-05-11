"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { emptyTemplateDocument } from "@/components/template-editor/schema";
import { api } from "@/trpc/react";

import { CategoriesPopover } from "../_categories-popover";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "untitled";

const inputCls =
  "w-full rounded-md border border-[#1f2937] bg-[#0b0f1a] px-3 py-2 text-sm text-[#e5e7eb] focus:border-[#7c5cff] focus:outline-none";

export default function NewStockTemplateForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tagsRaw, setTagsRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = api.admin.stockCreate.useMutation({
    onSuccess: (row) => router.push(`/admin/templates/${row.slug}/edit`),
    onError: (err) => setError(err.message),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name || !slug) {
      setError("name and slug required");
      return;
    }
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    create.mutate({
      slug: slugify(slug),
      name,
      description: description.trim() || null,
      categoryId,
      tags,
      documentJson: emptyTemplateDocument(),
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slug) setSlug(slugify(e.target.value));
            }}
            placeholder="Blog post"
            required
            className={inputCls}
          />
        </Field>
        <Field label="Slug" hint="lowercase letters, digits, dashes">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="blog-post"
            required
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Description" hint="Optional, shown in the catalogue card">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={400}
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Category">
          <CategoriesPopover value={categoryId} onChange={setCategoryId} />
        </Field>
        <Field label="Tags" hint="Comma-separated">
          <input
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="dark, editorial"
            className={inputCls}
          />
        </Field>
      </div>

      {error ? (
        <div className="rounded-md border border-[#7f1d1d] bg-[#1f0a0a] px-3 py-2 text-sm text-[#fca5a5]">
          {error}
        </div>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-full bg-[#7c5cff] px-6 py-2 font-medium text-white transition hover:bg-[#6b4be0] disabled:opacity-50"
        >
          {create.isPending ? "Creating…" : "Create & open editor"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs tracking-wide text-[#9ca3af] uppercase">
        {label}
      </span>
      {children}
      {hint ? <span className="text-[10px] text-[#6b7280]">{hint}</span> : null}
    </label>
  );
}
