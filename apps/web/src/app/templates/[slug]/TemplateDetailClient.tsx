"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { Node, ParamsSchema } from "@waku/ir";

import { TemplatePreview } from "@/components/marketplace/TemplatePreview";
import { api } from "@/trpc/react";

type Props = {
  slug: string;
  name: string;
  ir: Node;
  params: ParamsSchema;
  archetype: string;
  tags: string[];
  isAuthed: boolean;
};

export function TemplateDetailClient({
  slug,
  name,
  ir,
  params,
  archetype,
  tags,
  isAuthed,
}: Props) {
  const router = useRouter();
  const fork = api.marketplace.fork.useMutation({
    onSuccess: ({ template }) => {
      router.push(`/dashboard/templates/${template.slug}/edit`);
    },
  });
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const out: Record<string, unknown> = {};
    for (const [k, def] of Object.entries(params)) {
      if ("default" in def && def.default !== undefined) out[k] = def.default;
    }
    return out;
  });

  const onFork = async () => {
    setError(null);
    if (!isAuthed) {
      router.push("/");
      return;
    }
    try {
      await fork.mutateAsync({ slug });
    } catch (e) {
      setError(e instanceof Error ? e.message : "fork failed");
    }
  };

  const paramRows = useMemo(() => Object.entries(params), [params]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-xl border border-[#1f2937] bg-[#0b0f1a]">
          <TemplatePreview ir={ir} values={values} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{name}</h1>
            <span className="rounded-full border border-[#1f2937] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#9ca3af]">
              {archetype}
            </span>
          </div>
          <div className="mt-1 text-xs text-[#9ca3af]">
            {tags.join(" · ")}
          </div>
        </div>
      </div>

      <aside className="flex flex-col gap-4">
        <div className="rounded-xl border border-[#1f2937] bg-[#0b0f1a] p-4">
          <button
            type="button"
            onClick={onFork}
            disabled={fork.isPending}
            className="w-full rounded-md bg-[#7c5cff] px-4 py-2 text-sm font-medium text-white hover:bg-[#6b4be0] disabled:opacity-50"
          >
            {fork.isPending
              ? "Forking…"
              : isAuthed
                ? "Fork to my account"
                : "Sign in to fork"}
          </button>
          {error && (
            <div className="mt-2 text-xs text-[#fca5a5]">{error}</div>
          )}
          {!isAuthed && (
            <div className="mt-2 text-center text-xs text-[#9ca3af]">
              <Link href="/" className="underline">
                sign in
              </Link>{" "}
              to fork into your dashboard
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#1f2937] bg-[#0b0f1a] p-4">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-[#9ca3af]">
            Try parameters
          </div>
          <div className="flex flex-col gap-3">
            {paramRows.map(([key, def]) => (
              <ParamInput
                key={key}
                name={key}
                def={def}
                value={values[key]}
                onChange={(v) => setValues((prev) => ({ ...prev, [key]: v }))}
              />
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

function ParamInput({
  name,
  def,
  value,
  onChange,
}: {
  name: string;
  def: ParamsSchema[string];
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const cls =
    "w-full rounded-md border border-[#1f2937] bg-[#0a0e17] px-2 py-1.5 text-xs text-[#e5e7eb] focus:border-[#7c5cff] focus:outline-none";
  const label = (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[10px] uppercase tracking-wide text-[#9ca3af]">
        {name} · {def.kind}
      </span>
    </label>
  );
  switch (def.kind) {
    case "string":
    case "url":
      return (
        <div>
          {label}
          <input
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className={cls}
          />
        </div>
      );
    case "color":
      return (
        <div>
          {label}
          <input
            type="color"
            value={(value as string) ?? "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 w-full"
          />
        </div>
      );
    case "number":
      return (
        <div>
          {label}
          <input
            type="number"
            value={(value as number) ?? 0}
            onChange={(e) => onChange(Number(e.target.value))}
            className={cls}
          />
        </div>
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span>{name}</span>
        </label>
      );
    case "enum":
      return (
        <div>
          {label}
          <select
            value={(value as string) ?? def.values[0]}
            onChange={(e) => onChange(e.target.value)}
            className={cls}
          >
            {def.values.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
      );
  }
}
