export type NodeType =
  | "image"
  | "text"
  | "rectangle"
  | "ellipse"
  | "triangle"
  | "star"
  | "line";

export type ParamRef<T = unknown> = {
  $param: string;
  default?: T;
};

export type Value<T> = T | ParamRef<T>;

export const isParamRef = <T>(v: Value<T>): v is ParamRef<T> =>
  typeof v === "object" &&
  v !== null &&
  "$param" in (v as object) &&
  typeof (v as ParamRef<T>).$param === "string";

export type ParamKind = "string" | "url" | "color" | "number" | "boolean" | "enum";

export type ParamSchemaEntry =
  | { kind: "string"; default?: string; maxLen?: number }
  | { kind: "url"; default?: string }
  | { kind: "color"; default?: string }
  | { kind: "number"; default?: number; min?: number; max?: number }
  | { kind: "boolean"; default?: boolean }
  | { kind: "enum"; values: [string, ...string[]]; default?: string };

export type ParamsSchema = Record<string, ParamSchemaEntry>;

export interface BaseNode {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
}

export interface ImageNode extends BaseNode {
  type: "image";
  src: Value<string>;
  fit: "cover" | "contain";
}

export interface TextNode extends BaseNode {
  type: "text";
  text: Value<string>;
  fontSize: number;
  fontWeight: 400 | 500 | 600 | 700 | 800;
  italic: boolean;
  color: Value<string>;
  align: "left" | "center" | "right";
  fontFamily: string;
  letterSpacing: number;
  lineHeight: number;
}

interface ShapeBase extends BaseNode {
  fill: Value<string>;
  stroke: Value<string>;
  strokeWidth: number;
}

export interface RectangleNode extends ShapeBase {
  type: "rectangle";
  cornerRadius: number;
}

export interface EllipseNode extends ShapeBase {
  type: "ellipse";
}

export interface TriangleNode extends ShapeBase {
  type: "triangle";
}

export interface StarNode extends ShapeBase {
  type: "star";
  points: number;
  innerRadiusRatio: number;
}

export interface LineNode extends BaseNode {
  type: "line";
  stroke: Value<string>;
  strokeWidth: number;
  arrow: boolean;
}

export type EditorNode =
  | ImageNode
  | TextNode
  | RectangleNode
  | EllipseNode
  | TriangleNode
  | StarNode
  | LineNode;

export type ShapeNode =
  | RectangleNode
  | EllipseNode
  | TriangleNode
  | StarNode;

export interface Artboard {
  width: number;
  height: number;
  background: Value<string>;
}

export interface TemplateDocument {
  artboard: Artboard;
  nodes: EditorNode[];
  paramsSchema: ParamsSchema;
}

export type BindableField =
  | { type: "text"; field: "text"; kind: "string" }
  | { type: "text"; field: "color"; kind: "color" }
  | { type: "image"; field: "src"; kind: "url" }
  | { type: "rectangle" | "ellipse" | "triangle" | "star"; field: "fill"; kind: "color" }
  | { type: "rectangle" | "ellipse" | "triangle" | "star"; field: "stroke"; kind: "color" }
  | { type: "line"; field: "stroke"; kind: "color" };

export const resolveValue = <T>(
  v: Value<T>,
  draft: Record<string, unknown>,
): T | undefined => {
  if (isParamRef(v)) {
    const dv = draft[v.$param];
    if (dv !== undefined && dv !== null && dv !== "") return dv as T;
    return v.default;
  }
  return v;
};
