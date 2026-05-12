import {
  BunnyVariantUnavailableError,
  cacheKey,
  extractWoff2Url,
  fetchBunnyCss,
  resolveRequest,
  withCache,
  woffUrlFromWoff2,
  type FontRequest,
  type FontStyle,
  type FontWeight,
  type ResolvedRequest,
} from "./core";

export type { FontRequest, FontStyle, FontWeight } from "./core";

export interface FontBuffer {
  /** WOFF bytes. Pass directly to Satori `fonts: [{ data, ... }]`. */
  data: ArrayBuffer;
  url: string;
  family: string;
  weight: FontWeight;
  style: FontStyle;
}

/**
 * Fetch a WOFF font file as ArrayBuffer for use with Satori SSR.
 * Server-only — do not import from client components.
 *
 * Strategy: pull the @font-face CSS from Bunny (which lists WOFF2 URLs), swap
 * the extension to .woff, fetch the bytes. Bunny hosts WOFF + WOFF2 in
 * parallel at predictable paths. Satori accepts WOFF but not WOFF2.
 */
export function getFontBuffer(req: FontRequest): Promise<FontBuffer> {
  const r = resolveRequest(req);
  return withCache(cacheKey("buffer", r), () => fetchBuffer(r));
}

async function fetchBuffer(r: ResolvedRequest): Promise<FontBuffer> {
  try {
    return await fetchBufferAt(r);
  } catch (err) {
    // Bunny doesn't carry every weight × style combo for every family. Rather
    // than failing the whole render, downgrade once to weight 400 normal — the
    // baseline variant that every family on Bunny ships.
    if (
      err instanceof BunnyVariantUnavailableError &&
      (r.weight !== 400 || r.style !== "normal")
    ) {
      return fetchBufferAt({ ...r, weight: 400, style: "normal" });
    }
    throw err;
  }
}

async function fetchBufferAt(r: ResolvedRequest): Promise<FontBuffer> {
  const css = await fetchBunnyCss(r);
  const woff2 = extractWoff2Url(css, r.weight, r.style);
  const woff = woffUrlFromWoff2(woff2);
  const res = await fetch(woff);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch WOFF font: ${woff} (${res.status} ${res.statusText})`,
    );
  }
  const data = await res.arrayBuffer();
  return {
    data,
    url: woff,
    family: r.family,
    weight: r.weight,
    style: r.style,
  };
}
