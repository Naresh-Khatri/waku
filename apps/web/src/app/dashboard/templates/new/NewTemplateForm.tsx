"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Node, ParamsSchema } from "@waku/ir";
import { systemTemplates } from "@waku/templates";

import { AiAssistModal, type AiPickResult } from "@/components/ai/AiAssistModal";
import { api } from "@/trpc/react";

const BLANK_IR: Node = {
  type: "frame",
  w: 1200,
  h: 630,
  bg: "#0B1020",
  children: [
    {
      type: "stack",
      dir: "col",
      gap: 16,
      pad: 80,
      w: "fill",
      h: "fill",
      justify: "center",
      align: "start",
      children: [
        {
          type: "text",
          value: { $param: "title", default: "Blank canvas" },
          font: { family: "Inter", weight: 700 },
          size: 72,
          color: "#FFFFFF",
        },
      ],
    },
  ],
};

const BLANK_PARAMS: ParamsSchema = {
  title: { kind: "string", default: "Blank canvas", maxLen: 120 },
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "untitled";

type Starter = {
  id: string;
  name: string;
  description: string;
  ir: Node;
  params: ParamsSchema;
};

const STARTERS: Starter[] = [
  {
    id: "blank",
    name: "Blank canvas",
    description: "Start with an empty 1200×630 frame and one bound title.",
    ir: BLANK_IR,
    params: BLANK_PARAMS,
  },
  ...systemTemplates.map<Starter>((t) => ({
    id: t.slug,
    name: t.name,
    description: `${Object.keys(t.params).length} params · ${t.slug}`,
    ir: t.ir,
    params: t.params,
  })),
];

function bakeDefaults(
  params: ParamsSchema,
  values: Record<string, unknown>,
): ParamsSchema {
  const next: ParamsSchema = {};
  for (const [k, def] of Object.entries(params)) {
    const v = values[k];
    if (v === undefined) {
      next[k] = def;
      continue;
    }
    next[k] = { ...def, default: v as never };
  }
  return next;
}

export default function NewTemplateForm() {
  const router = useRouter();
  const [picked, setPicked] = useState<Starter | null>(null);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiRationale, setAiRationale] = useState<string | null>(null);

  const create = api.template.create.useMutation({
    onSuccess: ({ template }) => {
      router.push(`/dashboard/templates/${template.slug}/edit`);
    },
    onError: (err) => setError(err.message),
  });

  const onPick = (s: Starter) => {
    setPicked(s);
    setAiRationale(null);
    if (!name) setName(s.name);
    if (!slug) setSlug(slugify(s.name));
  };

  const onAiApply = (res: AiPickResult) => {
    const baked: Starter = {
      id: `ai-${res.templateSlug}`,
      name: res.templateName,
      description: res.rationale,
      ir: res.ir,
      params: bakeDefaults(res.params, res.values),
    };
    setPicked(baked);
    setAiRationale(res.rationale);
    if (!name) setName(res.templateName);
    if (!slug) setSlug(slugify(res.templateName));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!picked) {
      setError("pick a starter");
      return;
    }
    if (!slug || !name) {
      setError("name and slug required");
      return;
    }
    create.mutate({
      slug: slugify(slug),
      name,
      irJson: picked.ir,
      paramsSchemaJson: picked.params,
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <section className="flex items-center justify-between gap-3 rounded-xl border border-[#1f2937] bg-[#0b0f1a] p-4">
        <div>
          <div className="text-sm font-semibold">Describe what you want</div>
          <div className="text-xs text-[#9ca3af]">
            AI picks the best template and fills in the params for you.
          </div>
          {aiRationale && (
            <div className="mt-1 text-xs text-[#7c5cff]">{aiRationale}</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className="rounded-md border border-[#7c5cff] bg-[#7c5cff22] px-4 py-2 text-sm font-medium text-white hover:bg-[#7c5cff44]"
        >
          ✨ AI assist
        </button>
      </section>
      <section>
        <h2 className="mb-3 text-sm font-medium text-[#9ca3af]">
          …or pick a starter
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STARTERS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onPick(s)}
              className={`text-left rounded-xl border p-4 transition ${
                picked?.id === s.id
                  ? "border-[#7c5cff] bg-[#7c5cff11]"
                  : "border-[#1f2937] bg-[#0b0f1a] hover:border-[#374151]"
              }`}
            >
              <div className="text-sm font-semibold">{s.name}</div>
              <div className="mt-1 text-xs text-[#9ca3af]">{s.description}</div>
            </button>
          ))}
        </div>
      </section>

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

      {error && (
        <div className="rounded-md border border-[#7f1d1d] bg-[#1f0a0a] px-3 py-2 text-sm text-[#fca5a5]">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={create.isPending || !picked}
          className="rounded-full bg-[#7c5cff] px-6 py-2 font-medium text-white transition hover:bg-[#6b4be0] disabled:opacity-50"
        >
          {create.isPending ? "Creating…" : "Create & open editor"}
        </button>
      </div>

      <AiAssistModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onApply={onAiApply}
      />
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
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="text-xs text-[#6b7280]">{hint}</span>}
      {children}
    </label>
  );
}
