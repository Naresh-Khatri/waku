/**
 * @waku/sdk-core — framework-agnostic URL builder for Waku image templates.
 *
 * Goals: zero deps, tree-shakeable, deterministic encoding so a given param
 * map always produces the same URL (cache-friendly).
 */

export type Format = "png" | "webp" | "jpeg" | "jpg";

export type BuildOgUrlOptions<P extends Record<string, unknown>> = {
  /** Base render service URL. Defaults to https://r.waku.dev */
  baseUrl?: string;
  /** Account handle (e.g. "naresh") */
  user: string;
  /** Template slug */
  template: string;
  /** Version. Defaults to "published". */
  version?: number | "published";
  /** Param values to bake into the URL */
  params: P;
  /** Output format. Default "png". */
  format?: Format;
};

export const DEFAULT_BASE_URL = "https://r.waku.dev";

/**
 * Build a stable, cache-friendly Waku render URL.
 *
 *   buildOgUrl({ user: "naresh", template: "big-title", params: { title: "Hi" } })
 *     // → https://r.waku.dev/r/naresh/big-title/published?title=Hi
 */
export function buildOgUrl<P extends Record<string, unknown>>(
  opts: BuildOgUrlOptions<P>,
): string {
  const baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const version = opts.version ?? "published";
  const path = `/r/${encodeURIComponent(opts.user)}/${encodeURIComponent(
    opts.template,
  )}/${encodeURIComponent(String(version))}`;
  const ext = opts.format ? `.${normalizeFormat(opts.format)}` : "";
  const qs = encodeParams(opts.params);
  return `${baseUrl}${path}${ext}${qs ? `?${qs}` : ""}`;
}

const normalizeFormat = (f: Format): string => (f === "jpg" ? "jpeg" : f);

/**
 * Encode params with sorted keys so identical inputs yield identical URLs
 * (hits the same CDN cache entry regardless of object construction order).
 */
export function encodeParams(params: Record<string, unknown>): string {
  const entries: [string, string][] = [];
  for (const key of Object.keys(params).sort()) {
    const v = params[key];
    if (v === undefined || v === null) continue;
    if (typeof v === "boolean") {
      entries.push([key, v ? "true" : "false"]);
      continue;
    }
    if (Array.isArray(v)) {
      for (const item of v)
        entries.push([key, encodeURIComponent(String(item))]);
      continue;
    }
    entries.push([key, encodeURIComponent(String(v))]);
  }
  return entries.map(([k, v]) => `${encodeURIComponent(k)}=${v}`).join("&");
}

/**
 * Lightweight metadata helper — useful if you don't want the Next adapter.
 */
export type OgImageMetadata = {
  url: string;
  width: number;
  height: number;
  alt?: string;
};

export function ogImageMetadata<P extends Record<string, unknown>>(
  opts: BuildOgUrlOptions<P> & { width?: number; height?: number; alt?: string },
): OgImageMetadata {
  return {
    url: buildOgUrl(opts),
    width: opts.width ?? 1200,
    height: opts.height ?? 630,
    alt: opts.alt,
  };
}

export const SDK_CORE_VERSION = "0.1.0";
