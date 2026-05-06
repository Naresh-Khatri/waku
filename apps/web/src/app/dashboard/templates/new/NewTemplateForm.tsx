"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { api } from "@/trpc/react";

const STARTER_IR = JSON.stringify(
  {
    type: "frame",
    w: 1200,
    h: 630,
    bg: { $param: "bg", default: "#0B1020" },
    children: [
      {
        type: "stack",
        dir: "col",
        gap: 24,
        pad: 80,
        w: "fill",
        h: "fill",
        justify: "center",
        align: "start",
        children: [
          {
            type: "text",
            value: { $param: "title" },
            font: { family: "Inter", weight: 800 },
            size: 72,
            color: { $param: "fg", default: "#FFFFFF" },
          },
        ],
      },
    ],
  },
  null,
  2,
);

const STARTER_PARAMS = JSON.stringify(
  {
    title: { kind: "string", minLen: 1, maxLen: 120 },
    bg: { kind: "color", default: "#0B1020" },
    fg: { kind: "color", default: "#FFFFFF" },
  },
  null,
  2,
);

const Field = ({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-sm font-medium">{label}</span>
    {hint && <span className="text-xs text-[#6b7280]">{hint}</span>}
    {children}
  </label>
);

export default function NewTemplateForm() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [irText, setIrText] = useState(STARTER_IR);
  const [paramsText, setParamsText] = useState(STARTER_PARAMS);
  const [error, setError] = useState<string | null>(null);

  const create = api.template.create.useMutation({
    onSuccess: ({ template }) => {
      router.push(`/dashboard/templates/${template.slug}`);
    },
    onError: (err) => setError(err.message),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    let irJson: unknown;
    let paramsSchemaJson: unknown;
    try {
      irJson = JSON.parse(irText);
    } catch (err) {
      setError(`IR JSON invalid: ${(err as Error).message}`);
      return;
    }
    try {
      paramsSchemaJson = JSON.parse(paramsText);
    } catch (err) {
      setError(`Params JSON invalid: ${(err as Error).message}`);
      return;
    }
    create.mutate({
      slug,
      name,
      irJson: irJson as never,
      paramsSchemaJson: paramsSchemaJson as never,
    });
  };

  const inputCls =
    "rounded-md border border-[#1f2937] bg-[#0b0f1a] px-3 py-2 text-sm text-[#e5e7eb] focus:border-[#7c5cff] focus:outline-none";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Slug" hint="lowercase, dashes only — used in the URL">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-template"
            required
            className={inputCls}
          />
        </Field>
        <Field label="Name" hint="display name in your dashboard">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My template"
            required
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="IR JSON">
        <textarea
          value={irText}
          onChange={(e) => setIrText(e.target.value)}
          rows={16}
          required
          className={`${inputCls} font-mono`}
        />
      </Field>
      <Field label="Params schema">
        <textarea
          value={paramsText}
          onChange={(e) => setParamsText(e.target.value)}
          rows={8}
          required
          className={`${inputCls} font-mono`}
        />
      </Field>
      {error && (
        <div className="rounded-md border border-[#7f1d1d] bg-[#1f0a0a] px-3 py-2 text-sm text-[#fca5a5]">
          {error}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={create.isPending}
          className="rounded-full bg-[#7c5cff] px-6 py-2 font-medium text-white transition hover:bg-[#6b4be0] disabled:opacity-50"
        >
          {create.isPending ? "Creating..." : "Create"}
        </button>
      </div>
    </form>
  );
}
