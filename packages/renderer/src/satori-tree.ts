/**
 * Convert a (resolved) Waku IR `Node` tree to the JSX-object shape
 * Satori expects: `{ type, props: { style, children } }`.
 *
 * Inputs to this module MUST be fully param-resolved (no ParamRef nodes).
 * Use `resolve(ir, values)` from `@waku/ir` first.
 */

import type {
  Fill,
  FrameNode,
  Gradient,
  ImageNode,
  Inset,
  Node,
  ShapeNode,
  StackNode,
  TextNode,
  GradientNode,
} from "@waku/ir";

export type SatoriElement = {
  type: string;
  props: {
    style?: Record<string, unknown>;
    children?: SatoriElement | SatoriElement[] | string;
    src?: string;
  };
};

const padToCss = (p: Inset | undefined): Record<string, number> => {
  if (p === undefined) return {};
  if (typeof p === "number") return { padding: p };
  const out: Record<string, number> = {};
  if (p.t !== undefined) out.paddingTop = p.t;
  if (p.r !== undefined) out.paddingRight = p.r;
  if (p.b !== undefined) out.paddingBottom = p.b;
  if (p.l !== undefined) out.paddingLeft = p.l;
  return out;
};

const alignToCss = (a: StackNode["align"]): string | undefined => {
  switch (a) {
    case "start": return "flex-start";
    case "center": return "center";
    case "end": return "flex-end";
    case "stretch": return "stretch";
    default: return undefined;
  }
};

const justifyToCss = (j: StackNode["justify"]): string | undefined => {
  switch (j) {
    case "start": return "flex-start";
    case "center": return "center";
    case "end": return "flex-end";
    case "between": return "space-between";
    case "around": return "space-around";
    case "evenly": return "space-evenly";
    default: return undefined;
  }
};

const gradientToCss = (g: Gradient): string => {
  const stops = g.stops
    .map((s) => `${s.color} ${(s.offset * 100).toFixed(2)}%`)
    .join(", ");
  if (g.type === "linear") {
    const angle = g.angle ?? 0;
    return `linear-gradient(${angle}deg, ${stops})`;
  }
  return `radial-gradient(circle, ${stops})`;
};

const fillToCss = (f: Fill | undefined): { background?: string; backgroundColor?: string } => {
  if (f === undefined) return {};
  if (typeof f === "string") return { backgroundColor: f };
  // Resolved tree: ParamRef should already be gone. Treat as gradient.
  if ("type" in f && (f.type === "linear" || f.type === "radial")) {
    return { background: gradientToCss(f) };
  }
  return {};
};

const sizeToCss = (v: number | "fill" | undefined, key: "width" | "height"): Record<string, unknown> => {
  if (v === undefined) return {};
  if (v === "fill") return { [key]: "100%", flexGrow: 1 };
  return { [key]: v };
};

const div = (style: Record<string, unknown>, children?: SatoriElement[] | string): SatoriElement => ({
  type: "div",
  props: { style, children },
});

const renderFrame = (n: FrameNode): SatoriElement => {
  const style: Record<string, unknown> = {
    display: "flex",
    width: n.w,
    height: n.h,
    ...fillToCss(n.bg),
  };
  return div(style, n.children?.map(toSatori) ?? []);
};

const renderStack = (n: StackNode): SatoriElement => {
  const style: Record<string, unknown> = {
    display: "flex",
    flexDirection: n.dir === "row" ? "row" : "column",
    gap: n.gap ?? 0,
    ...padToCss(n.pad),
    ...sizeToCss(n.w, "width"),
    ...sizeToCss(n.h, "height"),
    ...fillToCss(n.bg),
  };
  const align = alignToCss(n.align);
  if (align) style.alignItems = align;
  const justify = justifyToCss(n.justify);
  if (justify) style.justifyContent = justify;
  if (n.radius !== undefined) style.borderRadius = n.radius;
  return div(style, n.children?.map(toSatori) ?? []);
};

const renderText = (n: TextNode): SatoriElement => {
  if (typeof n.value !== "string" || typeof n.color !== "string") {
    throw new Error("renderText: text.value/color must be resolved before satori conversion");
  }
  const style: Record<string, unknown> = {
    fontFamily: n.font.family,
    fontSize: n.size,
    color: n.color,
    fontWeight: n.weight ?? n.font.weight ?? 400,
    fontStyle: n.font.style ?? "normal",
    lineHeight: n.lineHeight ?? 1.2,
  };
  if (n.tracking !== undefined) style.letterSpacing = n.tracking;
  if (n.align) style.textAlign = n.align;
  if (n.maxLines !== undefined) {
    style.display = "-webkit-box";
    style.WebkitBoxOrient = "vertical";
    style.WebkitLineClamp = n.maxLines;
    style.overflow = "hidden";
  }
  return { type: "div", props: { style, children: n.value } };
};

const renderImage = (n: ImageNode): SatoriElement => {
  if (typeof n.src !== "string") {
    throw new Error("renderImage: image.src must be resolved before satori conversion");
  }
  const style: Record<string, unknown> = {
    objectFit: n.fit,
  };
  if (n.w !== undefined) style.width = n.w;
  if (n.h !== undefined) style.height = n.h;
  if (n.radius !== undefined) style.borderRadius = n.radius;
  return { type: "img", props: { style, src: n.src } };
};

const renderShape = (n: ShapeNode): SatoriElement => {
  const style: Record<string, unknown> = {
    width: n.w,
    height: n.h,
    ...fillToCss(n.fill),
  };
  if (n.kind === "circle") style.borderRadius = Math.max(n.w, n.h);
  else if (n.radius !== undefined) style.borderRadius = n.radius;
  return div(style);
};

const renderGradient = (n: GradientNode): SatoriElement => {
  const style: Record<string, unknown> = {
    width: n.w,
    height: n.h,
    background: gradientToCss(n.gradient),
  };
  if (n.radius !== undefined) style.borderRadius = n.radius;
  return div(style);
};

export const toSatori = (n: Node): SatoriElement => {
  switch (n.type) {
    case "frame": return renderFrame(n);
    case "stack": return renderStack(n);
    case "text": return renderText(n);
    case "image": return renderImage(n);
    case "shape": return renderShape(n);
    case "gradient": return renderGradient(n);
  }
};
