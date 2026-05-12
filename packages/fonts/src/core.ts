export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type FontStyle = "normal" | "italic";

export interface FontRequest {
  family: string;
  weight?: FontWeight;
  style?: FontStyle;
  display?: "auto" | "block" | "swap" | "fallback" | "optional";
}

export interface ResolvedRequest {
  family: string;
  weight: FontWeight;
  style: FontStyle;
  display: NonNullable<FontRequest["display"]>;
}

export function resolveRequest(req: FontRequest): ResolvedRequest {
  return {
    family: req.family,
    weight: req.weight ?? 400,
    style: req.style ?? "normal",
    display: req.display ?? "swap",
  };
}

export function cacheKey(scope: string, r: ResolvedRequest): string {
  return `${scope}|${r.family}|${r.weight}|${r.style}|${r.display}`;
}

const cache = new Map<string, Promise<unknown>>();

export function withCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as Promise<T> | undefined;
  if (hit) return hit;
  const pending = fn();
  cache.set(key, pending);
  pending.catch(() => cache.delete(key));
  return pending;
}

export function clearCache(): void {
  cache.clear();
}

function buildBunnyCss2Url(r: ResolvedRequest): string {
  const familyEnc = r.family.trim().replace(/\s+/g, "+");
  const ital = r.style === "italic" ? "1" : "0";
  const axes = `ital,wght@${ital},${r.weight}`;
  const params = new URLSearchParams({ display: r.display });
  return `https://fonts.bunny.net/css2?family=${familyEnc}:${axes}&${params.toString()}`;
}

const cssTextCache = new Map<string, Promise<string>>();

export function fetchBunnyCss(r: ResolvedRequest): Promise<string> {
  const url = buildBunnyCss2Url(r);
  const hit = cssTextCache.get(url);
  if (hit) return hit;
  const pending = (async () => {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
        Accept: "text/css,*/*;q=0.1",
      },
    });
    if (!res.ok) {
      throw new Error(
        `Bunny Fonts CSS fetch failed: ${url} (${res.status} ${res.statusText})`,
      );
    }
    return res.text();
  })();
  cssTextCache.set(url, pending);
  pending.catch(() => cssTextCache.delete(url));
  return pending;
}

const FONT_FACE_RE = /@font-face\s*\{([^}]+)\}/g;
const WEIGHT_RE = /font-weight:\s*(\d+)/;
const STYLE_RE = /font-style:\s*([a-z]+)/i;
const WOFF2_SRC_RE = /url\(\s*['"]?([^'")]+\.woff2[^'")]*)['"]?\s*\)\s+format\(['"]?woff2['"]?\)/;

export function extractWoff2Url(
  css: string,
  weight: FontWeight,
  style: FontStyle,
): string {
  const matches = css.matchAll(FONT_FACE_RE);
  let firstWoff2: string | null = null;
  for (const m of matches) {
    const block = m[1] ?? "";
    const w = WEIGHT_RE.exec(block);
    const s = STYLE_RE.exec(block);
    const u = WOFF2_SRC_RE.exec(block);
    if (!u) continue;
    if (firstWoff2 === null) firstWoff2 = u[1] ?? null;
    if (w && Number(w[1]) === weight && s && s[1]?.toLowerCase() === style) {
      return u[1] ?? "";
    }
  }
  if (firstWoff2) return firstWoff2;
  throw new Error("No WOFF2 url found in Bunny CSS response");
}

/**
 * Bunny hosts each variant in both WOFF2 and WOFF. We need WOFF for Satori
 * (which accepts TTF/OTF/WOFF but not WOFF2). The CSS API only mentions the
 * WOFF2 URL, so we derive the WOFF URL by extension swap.
 */
export function woffUrlFromWoff2(url: string): string {
  return url.replace(/\.woff2(\?|$)/, ".woff$1");
}
