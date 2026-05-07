/**
 * Waku IR v1 — JSON tree describing an image template.
 *
 * Terminology:
 * - `Param<T>` — a placeholder reference to a user-supplied URL param.
 * - `Value<T>` — either a literal `T` or a `Param<T>`. Resolved at render time.
 * - `Node` — a discriminated union of layout/content elements.
 *
 * Anything Satori cannot render is intentionally absent from v1
 * (no filters, blurs, masks, raw SVG escape hatch).
 */

export type ParamRef<T = unknown> = {
  $param: string;
  default?: T;
};

export type Value<T> = T | ParamRef<T>;

export type Inset =
  | number
  | {
      t?: number;
      r?: number;
      b?: number;
      l?: number;
    };

export type Align = "start" | "center" | "end" | "stretch";
export type Justify = "start" | "center" | "end" | "between" | "around" | "evenly";

export type FontRef = {
  family: string;
  weight?: number;
  style?: "normal" | "italic";
};

export type GradientStop = {
  color: string;
  /** 0..1 */
  offset: number;
};

export type Gradient = {
  type: "linear" | "radial";
  stops: GradientStop[];
  /** linear only; degrees, 0 = top-to-bottom */
  angle?: number;
};

export type Fill = string | Gradient | ParamRef<string>;

export interface FrameNode {
  type: "frame";
  w: number;
  h: number;
  bg?: Fill;
  children?: Node[];
}

/**
 * When both `x` and `y` are set on a non-root node, the renderer positions
 * the node absolutely within its parent (parent becomes position:relative).
 * Otherwise the node stays in flow.
 */
export interface StackNode {
  type: "stack";
  dir: "row" | "col";
  gap?: number;
  align?: Align;
  justify?: Justify;
  pad?: Inset;
  /** numeric or 'fill' to expand within parent */
  w?: number | "fill";
  h?: number | "fill";
  bg?: Fill;
  radius?: number;
  x?: number;
  y?: number;
  children?: Node[];
}

export interface TextNode {
  type: "text";
  value: Value<string>;
  font: FontRef;
  size: number;
  color: Value<string>;
  weight?: number;
  /** letter-spacing in px */
  tracking?: number;
  /** unitless multiplier */
  lineHeight?: number;
  maxLines?: number;
  align?: "left" | "center" | "right";
  x?: number;
  y?: number;
}

export interface ImageNode {
  type: "image";
  src: Value<string>;
  fit: "cover" | "contain";
  w?: number;
  h?: number;
  radius?: number;
  x?: number;
  y?: number;
}

export interface ShapeNode {
  type: "shape";
  kind: "rect" | "circle";
  w: number;
  h: number;
  fill?: Fill;
  radius?: number;
  x?: number;
  y?: number;
}

export interface GradientNode {
  type: "gradient";
  w: number;
  h: number;
  gradient: Gradient;
  radius?: number;
  x?: number;
  y?: number;
}

export type Node =
  | FrameNode
  | StackNode
  | TextNode
  | ImageNode
  | ShapeNode
  | GradientNode;

export type NodeType = Node["type"];

export const isParamRef = (v: unknown): v is ParamRef =>
  typeof v === "object" && v !== null && "$param" in v && typeof (v as ParamRef).$param === "string";
