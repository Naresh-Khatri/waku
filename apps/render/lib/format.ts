import type { RenderFormat } from "@waku/renderer";

export const SUPPORTED: ReadonlyArray<RenderFormat> = ["png", "webp", "jpeg"];

const MIME_TO_FORMAT: Record<string, RenderFormat> = {
  "image/png": "png",
  "image/webp": "webp",
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
};

const isFormat = (s: string): s is RenderFormat =>
  (SUPPORTED as ReadonlyArray<string>).includes(s);

/**
 * Pick output format from explicit query param, then Accept header, then default.
 * Returns null if `?format=` is set but invalid (caller can 400).
 */
export const negotiateFormat = (
  query: string | null,
  acceptHeader: string | null,
): RenderFormat | null => {
  if (query) {
    const q = query.toLowerCase();
    return isFormat(q) ? q : null;
  }
  if (acceptHeader) {
    // Parse Accept header, sort by q (default 1), pick first match.
    const candidates = acceptHeader
      .split(",")
      .map((part) => {
        const [type, ...params] = part.trim().split(";");
        const q = params.find((p) => p.trim().startsWith("q="));
        const qv = q ? Number(q.split("=")[1]) : 1;
        return { type: (type ?? "").trim().toLowerCase(), q: Number.isFinite(qv) ? qv : 0 };
      })
      .filter((c) => c.type)
      .sort((a, b) => b.q - a.q);
    for (const c of candidates) {
      if (c.type in MIME_TO_FORMAT) return MIME_TO_FORMAT[c.type]!;
      if (c.type === "image/*") return "png";
    }
  }
  return "png";
};
