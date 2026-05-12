import {
  cacheKey,
  extractWoff2Url,
  fetchBunnyCss,
  resolveRequest,
  withCache,
  woffUrlFromWoff2,
  type FontRequest,
  type FontStyle,
  type FontWeight,
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
  return withCache(cacheKey("buffer", r), async () => {
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
  });
}
