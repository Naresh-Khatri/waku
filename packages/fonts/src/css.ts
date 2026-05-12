import {
  cacheKey,
  extractWoff2Url,
  fetchBunnyCss,
  resolveRequest,
  withCache,
  type FontRequest,
  type FontStyle,
  type FontWeight,
} from "./core";

export type { FontRequest, FontStyle, FontWeight } from "./core";

export interface FontCss {
  /** The full @font-face CSS returned by Bunny. Inject into a <style> tag. */
  css: string;
  /** Direct WOFF2 URL for the requested weight/style. */
  url: string;
  family: string;
  weight: FontWeight;
  style: FontStyle;
}

/**
 * Fetch the @font-face CSS + WOFF2 URL for one variant of a Google/Bunny font.
 * Safe to call from the browser, RSCs, or Node — never returns font bytes.
 * Cached per (family, weight, style, display) for the lifetime of the process.
 */
export function getFontCss(req: FontRequest): Promise<FontCss> {
  const r = resolveRequest(req);
  return withCache(cacheKey("css", r), async () => {
    const css = await fetchBunnyCss(r);
    const url = extractWoff2Url(css, r.weight, r.style);
    return {
      css,
      url,
      family: r.family,
      weight: r.weight,
      style: r.style,
    };
  });
}
