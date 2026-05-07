"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { emptyTemplateDocument } from "@/components/template-editor/schema";
import { api } from "@/trpc/react";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "untitled";

export default function NewTemplateForm() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = api.template.create.useMutation({
    onSuccess: ({ template }) => {
      router.push(`/dashboard/templates/${template.slug}/edit`);
    },
    onError: (err) => setError(err.message),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!slug || !name) {
      setError("name and slug required");
      return;
    }
    create.mutate({
      slug: slugify(slug),
      name,
      documentJson: emptyTemplateDocument(),
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slug) setSlug(slugify(e.target.value));
            }}
            placeholder="My template"
            required
            className={inputCls}
          />
        </Field>
        <Field label="Slug" hint="lowercase, dashes only — used in URLs">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-template"
            required
            className={inputCls}
          />
        </Field>
      </section>

      {error ? (
        <div className="rounded-md border border-[#7f1d1d] bg-[#1f0a0a] px-3 py-2 text-sm text-[#fca5a5]">
          {error}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
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

const inputCls =
  "w-full rounded-md border border-[#1f2937] bg-[#0b0f1a] px-3 py-2 text-sm text-[#e5e7eb] focus:border-[#7c5cff] focus:outline-none";

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
      <span className="text-xs uppercase tracking-wide text-[#9ca3af]">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="text-[10px] text-[#6b7280]">{hint}</span>
      ) : null}
    </label>
  );
}
