/**
 * Pure IR → CSS prop helpers, shared between Satori conversion (server)
 * and the editor's <IRRenderer> (browser). No runtime deps on satori/resvg/sharp.
 *
 * Inputs MUST be fully param-resolved (no ParamRef nodes) before reaching here.
 */

import type { Fill, Gradient, Inset, StackNode } from "@waku/ir";

export const padToCss = (p: Inset | undefined): Record<string, number> => {
  if (p === undefined) return {};
  if (typeof p === "number") return { padding: p };
  const out: Record<string, number> = {};
  if (p.t !== undefined) out.paddingTop = p.t;
  if (p.r !== undefined) out.paddingRight = p.r;
  if (p.b !== undefined) out.paddingBottom = p.b;
  if (p.l !== undefined) out.paddingLeft = p.l;
  return out;
};

export const alignToCss = (a: StackNode["align"]): string | undefined => {
  switch (a) {
    case "start":
      return "flex-start";
    case "center":
      return "center";
    case "end":
      return "flex-end";
    case "stretch":
      return "stretch";
    default:
      return undefined;
  }
};

export const justifyToCss = (j: StackNode["justify"]): string | undefined => {
  switch (j) {
    case "start":
      return "flex-start";
    case "center":
      return "center";
    case "end":
      return "flex-end";
    case "between":
      return "space-between";
    case "around":
      return "space-around";
    case "evenly":
      return "space-evenly";
    default:
      return undefined;
  }
};

export const gradientToCss = (g: Gradient): string => {
  const stops = g.stops
    .map((s) => `${s.color} ${(s.offset * 100).toFixed(2)}%`)
    .join(", ");
  if (g.type === "linear") {
    const angle = g.angle ?? 0;
    return `linear-gradient(${angle}deg, ${stops})`;
  }
  return `radial-gradient(circle, ${stops})`;
};

export const fillToCss = (
  f: Fill | undefined,
): { background?: string; backgroundColor?: string } => {
  if (f === undefined) return {};
  if (typeof f === "string") return { backgroundColor: f };
  if ("type" in f && (f.type === "linear" || f.type === "radial")) {
    return { background: gradientToCss(f) };
  }
  return {};
};

export const sizeToCss = (
  v: number | "fill" | undefined,
  key: "width" | "height",
): Record<string, unknown> => {
  if (v === undefined) return {};
  if (v === "fill") return { [key]: "100%", flexGrow: 1 };
  return { [key]: v };
};
