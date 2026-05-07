"use client";

import { Check, ChevronDown, ChevronUp, Copy, Link } from "lucide-react";
import { useMemo, useState } from "react";
import { ColorPicker } from "./color-picker";
import { useEditor } from "./store";
import type { ParamSchemaEntry, ParamsSchema } from "./types";
import { searchFromParams } from "./url-params";

export function ParamsCard({
  liveUrl,
}: {
  liveUrl?: string;
}) {
  const paramsSchema = useEditor((s) => s.paramsSchema);
  const draftValues = useEditor((s) => s.draftValues);
  const setDraftValue = useEditor((s) => s.setDraftValue);

  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const entries = useMemo(
    () => Object.entries(paramsSchema).sort(([a], [b]) => a.localeCompare(b)),
    [paramsSchema],
  );

  const copyUrl = async () => {
    const url = buildUrl(liveUrl, draftValues, paramsSchema);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (entries.length === 0) {
    return (
      <div className="absolute bottom-3 left-3 z-10 inline-flex h-9 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs text-zinc-500 shadow-md">
        No params yet — click the link icon next to a field to bind one.
      </div>
    );
  }

  return (
    <div className="absolute bottom-3 left-3 z-10 w-[280px] rounded-xl border border-zinc-200 bg-white text-xs shadow-md">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full items-center justify-between rounded-xl px-3 text-zinc-700 hover:bg-zinc-50"
      >
        <span className="font-semibold uppercase tracking-wide text-zinc-500">
          Params · {entries.length}
        </span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
        )}
      </button>

      {open ? (
        <div className="border-t border-zinc-100 px-3 py-2">
          <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
            {entries.map(([name, entry]) => (
              <ParamRow
                key={name}
                name={name}
                entry={entry}
                value={draftValues[name]}
                onChange={(v) => setDraftValue(name, v)}
              />
            ))}
          </div>
          {liveUrl ? (
            <div className="mt-2 flex items-center gap-1.5 border-t border-zinc-100 pt-2">
              <Link className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              <button
                onClick={copyUrl}
                className="flex h-7 flex-1 items-center justify-between gap-2 rounded-md bg-zinc-100 px-2 text-[11px] text-zinc-700 hover:bg-zinc-200"
              >
                <span className="truncate font-mono">
                  {buildUrl(liveUrl, draftValues, paramsSchema) ?? liveUrl}
                </span>
                {copied ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                )}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ParamRow({
  name,
  entry,
  value,
  onChange,
}: {
  name: string;
  entry: ParamSchemaEntry;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[10px] text-indigo-700">{`{${name}}`}</span>
        <span className="text-[10px] uppercase tracking-wide text-zinc-400">
          {entry.kind}
        </span>
      </div>
      <ParamControl entry={entry} value={value} onChange={onChange} />
    </div>
  );
}

function ParamControl({
  entry,
  value,
  onChange,
}: {
  entry: ParamSchemaEntry;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const cls =
    "h-7 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-800 outline-none focus:border-indigo-400";

  switch (entry.kind) {
    case "string": {
      const v = typeof value === "string" ? value : (entry.default ?? "");
      return (
        <input
          type="text"
          value={v}
          maxLength={entry.maxLen}
          onChange={(e) => onChange(e.target.value)}
          placeholder={entry.default}
          className={cls}
        />
      );
    }
    case "url": {
      const v = typeof value === "string" ? value : (entry.default ?? "");
      return (
        <input
          type="url"
          value={v}
          onChange={(e) => onChange(e.target.value)}
          placeholder={entry.default}
          className={cls}
        />
      );
    }
    case "color": {
      const v = typeof value === "string" ? value : (entry.default ?? "#000000");
      return <ColorPicker value={v} onChange={onChange} label="Param color" />;
    }
    case "number": {
      const v = typeof value === "number" ? value : (entry.default ?? 0);
      return (
        <input
          type="number"
          value={Number.isFinite(v) ? v : 0}
          min={entry.min}
          max={entry.max}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onChange(Number.isFinite(n) ? n : 0);
          }}
          className={cls}
        />
      );
    }
    case "boolean": {
      const v =
        typeof value === "boolean" ? value : (entry.default ?? false);
      return (
        <label className="flex h-7 items-center gap-2">
          <input
            type="checkbox"
            checked={v}
            onChange={(e) => onChange(e.target.checked)}
            className="accent-indigo-500"
          />
          <span className="text-[11px] text-zinc-500">{v ? "true" : "false"}</span>
        </label>
      );
    }
    case "enum": {
      const v =
        typeof value === "string" && entry.values.includes(value)
          ? value
          : (entry.default ?? entry.values[0]);
      return (
        <select
          value={v}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        >
          {entry.values.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }
  }
}

function buildUrl(
  base: string | undefined,
  values: Record<string, unknown>,
  schema: ParamsSchema,
): string | null {
  if (!base) return null;
  const sp = searchFromParams(values, schema);
  const qs = sp.toString();
  if (!qs) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${qs}`;
}
