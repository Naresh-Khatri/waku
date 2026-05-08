"use client";

import { Check, Copy, Link, Sliders, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ColorPicker } from "./color-picker";
import {
  OgSocialPreview,
  PLATFORMS,
  PlatformIcon,
  StatusDot,
  useRenderedImage,
  type Platform,
} from "./og-preview";
import { useEditor } from "./store";
import type { ParamSchemaEntry, ParamsSchema } from "./types";
import { searchFromParams } from "./url-params";

const TRANSITION = { type: "spring" as const, stiffness: 320, damping: 32 };

export function ParamsCard({ liveUrl }: { liveUrl?: string }) {
  const paramsSchema = useEditor((s) => s.paramsSchema);
  const draftValues = useEditor((s) => s.draftValues);
  const setDraftValue = useEditor((s) => s.setDraftValue);

  const [copied, setCopied] = useState(false);
  const [platform, setPlatform] = useState<Platform>("x");
  const [expanded, setExpanded] = useState(true);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!expanded) return;
    const onMouseDown = (e: MouseEvent) => {
      const node = panelRef.current;
      if (!node) return;
      if (e.target instanceof Node && !node.contains(e.target)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [expanded]);

  const entries = useMemo(
    () => Object.entries(paramsSchema).sort(([a], [b]) => a.localeCompare(b)),
    [paramsSchema],
  );

  const fullUrl =
    buildUrl(liveUrl, draftValues, paramsSchema) ?? liveUrl ?? null;
  const handle = useMemo(() => extractHandle(liveUrl), [liveUrl]);
  const showPreview = Boolean(liveUrl && fullUrl);
  const { imageUrl, status } = useRenderedImage(showPreview ? fullUrl : null);

  const copyUrl = async () => {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <>
      <AnimatePresence>
        {expanded ? (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setExpanded(false)}
            className="backdrop-blur-xs fixed inset-0 z-[5] bg-black/10"
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {!expanded ? (
          <motion.button
            key="pill"
            layoutId="params-card"
            onClick={() => setExpanded(true)}
            transition={TRANSITION}
            className="absolute bottom-3 left-3 z-10 flex h-9 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 shadow-md hover:bg-zinc-50"
            title="Show preview"
          >
            <Sliders className="h-3.5 w-3.5 text-zinc-500" />
            <span className="font-semibold uppercase tracking-wide text-zinc-500">
              Preview
            </span>
          </motion.button>
        ) : (
          <motion.div
            key="panel"
            ref={panelRef}
            layoutId="params-card"
            transition={TRANSITION}
            className="absolute bottom-3 left-3 z-10 flex h-[475px] w-[720px] max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white text-xs shadow-md"
          >
            <div className="absolute right-1.5 top-1.5 z-20 flex items-center gap-1.5">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200 bg-white shadow-sm"
                title={
                  status.kind === "ok"
                    ? `rendered in ${status.ms}ms`
                    : status.kind === "loading"
                      ? "rendering…"
                      : status.kind === "error"
                        ? status.message
                        : "idle"
                }
              >
                <StatusDot status={status} />
              </span>
              <button
                onClick={() => setExpanded(false)}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200 bg-zinc-100 text-zinc-600 shadow-sm hover:border-zinc-300 hover:bg-zinc-200 hover:text-zinc-900"
                aria-label="Hide"
                title="Hide"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1">
              <div className="flex w-[280px] shrink-0 flex-col">
                <div className="flex h-9 items-center px-3">
                  <span className="font-semibold uppercase tracking-wide text-zinc-500">
                    {entries.length === 0
                      ? "No params"
                      : `Params · ${entries.length}`}
                  </span>
                </div>

                {entries.length === 0 ? (
                  <div className="flex-1 border-t border-zinc-100 px-3 py-2 text-[11px] text-zinc-500">
                    Click the link icon next to a field to bind a param.
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 flex-col border-t border-zinc-100">
                    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                      <div className="space-y-2 pr-1">
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
                    </div>
                  </div>
                )}
              </div>

              {showPreview ? (
                <div className="flex w-[440px] shrink-0 flex-col border-l border-zinc-200 bg-zinc-50">
                  <div className="min-h-0 flex-1 overflow-hidden">
                    <OgSocialPreview
                      url={fullUrl}
                      imageUrl={imageUrl}
                      status={status}
                      platform={platform}
                      handle={handle}
                    />
                  </div>
                  <div className="flex shrink-0 border-t border-zinc-200 bg-white">
                    <div className="relative min-w-0 flex-1 overflow-hidden">
                      <div className="flex h-9 items-center gap-1 overflow-x-auto px-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {PLATFORMS.map((p) => {
                          const active = platform === p.id;
                          return (
                            <button
                              key={p.id}
                              onClick={() => setPlatform(p.id)}
                              title={p.label}
                              aria-label={p.label}
                              className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                                active
                                  ? "text-white"
                                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                              }`}
                            >
                              {active ? (
                                <motion.span
                                  layoutId="platform-pill"
                                  transition={TRANSITION}
                                  className="absolute inset-0 rounded-md bg-zinc-900"
                                />
                              ) : null}
                              <span className="relative flex items-center justify-center">
                                <PlatformIcon platform={p.id} />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent" />
                      <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent" />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {liveUrl ? (
              <button
                onClick={copyUrl}
                title={fullUrl ?? undefined}
                className={`group flex shrink-0 items-center gap-2 border-t px-2 py-2 text-[11px] transition-colors ${
                  copied
                    ? "border-emerald-300 bg-emerald-100"
                    : "border-emerald-200 bg-emerald-50 hover:bg-emerald-100/60"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                    copied
                      ? "bg-emerald-200 text-emerald-800"
                      : "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200"
                  }`}
                >
                  <Link className="h-3.5 w-3.5" />
                </span>
                <span
                  className={`min-w-0 flex-1 truncate text-left font-mono ${
                    copied ? "text-emerald-800" : "text-emerald-900"
                  }`}
                >
                  {copied ? "Copied to clipboard" : (fullUrl ?? liveUrl)}
                </span>
                <span
                  className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-white transition-colors ${
                    copied
                      ? "bg-emerald-600"
                      : "bg-emerald-700 group-hover:bg-emerald-800"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </>
                  )}
                </span>
              </button>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
      const v =
        typeof value === "string" ? value : (entry.default ?? "#000000");
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
      const v = typeof value === "boolean" ? value : (entry.default ?? false);
      return (
        <label className="flex h-7 items-center gap-2">
          <input
            type="checkbox"
            checked={v}
            onChange={(e) => onChange(e.target.checked)}
            className="accent-indigo-500"
          />
          <span className="text-[11px] text-zinc-500">
            {v ? "true" : "false"}
          </span>
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

function extractHandle(liveUrl: string | undefined): string {
  if (!liveUrl) return "yoursite";
  try {
    const u = new URL(liveUrl);
    const parts = u.pathname.split("/").filter(Boolean);
    const i = parts.indexOf("r");
    if (i >= 0 && parts[i + 1]) return parts[i + 1] ?? "yoursite";
  } catch {
    /* fall through */
  }
  return "yoursite";
}
