"use client";

import { useEffect, useMemo, useState } from "react";
import type { ParamSchemaEntry, ParamsSchema } from "@waku/ir";

type Props = {
  slug: string;
  version: number;
  params: ParamsSchema;
  defaults: Record<string, unknown>;
};

const useDebounced = <T,>(value: T, ms = 200): T => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
};

const buildUrl = (slug: string, version: number, values: Record<string, string>): string => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(values)) {
    if (v !== "") sp.set(k, v);
  }
  return `/r/${slug}/${version}?${sp.toString()}`;
};

const Field = ({
  name,
  entry,
  value,
  onChange,
}: {
  name: string;
  entry: ParamSchemaEntry;
  value: string;
  onChange: (v: string) => void;
}) => {
  const common: React.CSSProperties = {
    background: "#0b0f1a",
    color: "#e5e7eb",
    border: "1px solid #1f2937",
    borderRadius: 8,
    padding: "8px 12px",
    width: "100%",
    fontSize: 14,
    fontFamily: "inherit",
  };
  if (entry.kind === "color") {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="color"
          value={value || (entry.default ?? "#000000")}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: 44, height: 36, border: "none", background: "transparent" }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={entry.default ?? "#RRGGBB"}
          style={common}
        />
      </div>
    );
  }
  if (entry.kind === "number") {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={common}
        {...(entry.min !== undefined ? { min: entry.min } : {})}
        {...(entry.max !== undefined ? { max: entry.max } : {})}
      />
    );
  }
  if (entry.kind === "boolean") {
    return (
      <input
        type="checkbox"
        checked={value === "true" || value === "1"}
        onChange={(e) => onChange(e.target.checked ? "true" : "false")}
      />
    );
  }
  if (entry.kind === "enum") {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} style={common}>
        {entry.values.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    );
  }
  const isLong = entry.kind === "string" && (entry.maxLen ?? 0) > 80;
  if (isLong) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        style={{ ...common, resize: "vertical" }}
      />
    );
  }
  return (
    <input
      type={entry.kind === "url" ? "url" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={common}
    />
  );
};

export default function PlaygroundClient({ slug, version, params, defaults }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const k of Object.keys(params)) init[k] = String(defaults[k] ?? "");
    return init;
  });
  const debounced = useDebounced(values, 250);
  const previewUrl = useMemo(() => buildUrl(slug, version, debounced), [slug, version, debounced]);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    const abs = window.location.origin + previewUrl;
    await navigator.clipboard.writeText(abs);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <main
      style={{
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        padding: 32,
        color: "#e5e7eb",
        background: "#030712",
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "360px 1fr",
        gap: 32,
      }}
    >
      <aside>
        <a href="/templates" style={{ color: "#9ca3af", fontSize: 14, textDecoration: "none" }}>
          ← all templates
        </a>
        <h1 style={{ marginTop: 8, marginBottom: 4 }}>{slug}</h1>
        <div style={{ color: "#9ca3af", fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
          v{version}
        </div>
        <form style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {Object.entries(params).map(([name, entry]) => (
            <label key={name} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, color: "#9ca3af" }}>
                {name}
                <span style={{ marginLeft: 6, color: "#4b5563" }}>{entry.kind}</span>
              </span>
              <Field
                name={name}
                entry={entry}
                value={values[name] ?? ""}
                onChange={(v) => setValues((prev) => ({ ...prev, [name]: v }))}
              />
            </label>
          ))}
        </form>
        <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={copy}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #374151",
              background: copied ? "#22d3ee" : "#1f2937",
              color: copied ? "#030712" : "#e5e7eb",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {copied ? "Copied!" : "Copy URL"}
          </button>
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #374151",
              color: "#e5e7eb",
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            Open
          </a>
        </div>
      </aside>
      <section>
        <div
          style={{
            background: "#0b0f1a",
            border: "1px solid #1f2937",
            borderRadius: 12,
            padding: 16,
            position: "sticky",
            top: 32,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={`${slug} preview`}
            style={{ width: "100%", height: "auto", borderRadius: 8, display: "block" }}
          />
          <div style={{ marginTop: 12, fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#9ca3af", wordBreak: "break-all" }}>
            {previewUrl}
          </div>
        </div>
      </section>
    </main>
  );
}
