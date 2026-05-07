import type { ParamsSchema } from "./types";

const RESERVED = new Set(["format", "_sig", "_ts"]);

export function paramsFromSearch(
  search: URLSearchParams | string | null | undefined,
  schema: ParamsSchema,
): Record<string, unknown> {
  if (!search) return {};
  const sp =
    typeof search === "string" ? new URLSearchParams(search) : search;
  const out: Record<string, unknown> = {};
  for (const [name, entry] of Object.entries(schema)) {
    if (RESERVED.has(name)) continue;
    const raw = sp.get(name);
    if (raw === null) continue;
    switch (entry.kind) {
      case "string":
      case "url":
      case "color":
        out[name] = raw;
        break;
      case "number": {
        const n = Number(raw);
        if (Number.isFinite(n)) out[name] = n;
        break;
      }
      case "boolean":
        out[name] = raw === "1" || raw.toLowerCase() === "true";
        break;
      case "enum":
        if (entry.values.includes(raw)) out[name] = raw;
        break;
    }
  }
  return out;
}

export function searchFromParams(
  values: Record<string, unknown>,
  schema: ParamsSchema,
): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [name, entry] of Object.entries(schema)) {
    const v = values[name];
    if (v === undefined || v === null || v === "") continue;
    switch (entry.kind) {
      case "string":
      case "url":
      case "color":
        if (typeof v === "string" && v.length > 0) sp.set(name, v);
        break;
      case "number":
        if (typeof v === "number" && Number.isFinite(v)) sp.set(name, String(v));
        break;
      case "boolean":
        if (typeof v === "boolean") sp.set(name, v ? "1" : "0");
        break;
      case "enum":
        if (typeof v === "string" && entry.values.includes(v)) sp.set(name, v);
        break;
    }
  }
  return sp;
}
