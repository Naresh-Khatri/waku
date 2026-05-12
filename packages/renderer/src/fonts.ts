import { getFontBuffer, type FontStyle, type FontWeight } from "@waku/fonts/server";

import type { TemplateDocument } from "./document";

export type LoadedFont = {
  name: string;
  data: ArrayBuffer;
  weight: FontWeight;
  style: FontStyle;
};

export type FontVariant = {
  family: string;
  weight: FontWeight;
  style?: FontStyle;
};

/**
 * Fetch WOFF bytes for the variants Satori needs. Each variant is deduped and
 * cached inside `@waku/fonts`, so this is cheap to call repeatedly with the
 * same set.
 */
export const loadFonts = (
  variants: readonly FontVariant[],
): Promise<LoadedFont[]> =>
  Promise.all(
    variants.map(async (v) => {
      const style: FontStyle = v.style ?? "normal";
      const { data } = await getFontBuffer({
        family: v.family,
        weight: v.weight,
        style,
      });
      return { name: v.family, data, weight: v.weight, style };
    }),
  );

const FALLBACK: FontVariant = { family: "Inter", weight: 400, style: "normal" };

/**
 * Walk the document's text nodes to collect every (family, weight) pair
 * actually referenced. Always includes Inter 400 as a fallback so Satori has
 * a baseline face even for docs without text.
 */
export const collectFontVariants = (
  doc: TemplateDocument,
): FontVariant[] => {
  const seen = new Set<string>();
  const out: FontVariant[] = [];
  const push = (v: FontVariant) => {
    const k = `${v.family}|${v.weight}|${v.style ?? "normal"}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(v);
  };
  push(FALLBACK);
  for (const node of doc.nodes) {
    if (node.type !== "text") continue;
    push({ family: node.fontFamily, weight: node.fontWeight, style: "normal" });
  }
  return out;
};
