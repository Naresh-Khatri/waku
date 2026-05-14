import type { ParamKind, ParamSchemaEntry, ParamsSchema } from "./types";

export const VALID_NAME = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

export function uniqueName(base: string, schema: ParamsSchema): string {
  if (!(base in schema)) return base;
  let i = 2;
  while (`${base}-${i}` in schema) i++;
  return `${base}-${i}`;
}

export function makeEntry(
  kind: ParamKind,
  raw: string,
): ParamSchemaEntry | null {
  const e: ParamSchemaEntry = { kind };
  if (raw) e.default = raw;
  return e;
}

export function parseRaw(_kind: ParamKind, raw: string): unknown {
  return raw;
}

export function defaultPreview(entry: ParamSchemaEntry): {
  text: string;
  swatch?: string;
} {
  const d = entry.default;
  if (d === undefined) return { text: "" };
  if (entry.kind === "color") return { text: d, swatch: d };
  return { text: d };
}

export const PARAM_KINDS: { value: ParamKind; label: string }[] = [
  { value: "string", label: "Text" },
  { value: "color", label: "Color" },
];
