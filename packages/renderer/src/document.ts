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

export type ParamKind =
  | "string"
  | "url"
  | "color"
  | "number"
  | "boolean"
  | "enum";

export interface ColorStop {
  color: Value<string>;
  position: number;
}

export type Paint =
  | { kind: "flat"; color: Value<string> }
  | { kind: "linear"; angle: number; stops: ColorStop[] }
  | { kind: "radial"; cx: number; cy: number; stops: ColorStop[] };

export const flatPaint = (color: Value<string>): Paint => ({
  kind: "flat",
  color,
});

export const isFlatPaint = (
  p: Paint,
): p is { kind: "flat"; color: Value<string> } => p.kind === "flat";

const stopsToCss = (
  stops: ColorStop[],
  draft: Record<string, unknown>,
): string =>
  stops
    .map(
      (s) =>
        `${resolveValue(s.color, draft) ?? "#000000"} ${(s.position * 100).toFixed(2)}%`,
    )
    .join(", ");

export const paintToCss = (
  paint: Paint,
  draft: Record<string, unknown>,
): string => {
  switch (paint.kind) {
    case "flat":
      return resolveValue(paint.color, draft) ?? "transparent";
    case "linear":
      return `linear-gradient(${paint.angle}deg, ${stopsToCss(paint.stops, draft)})`;
    case "radial":
      return `radial-gradient(circle at ${(paint.cx * 100).toFixed(2)}% ${(paint.cy * 100).toFixed(2)}%, ${stopsToCss(paint.stops, draft)})`;
  }
};

/**
 * For SVG-based shapes. For flat paints returns just a paint string for use as
 * fill/stroke. For gradients returns an SVG `<linearGradient>`/`<radialGradient>`
 * fragment plus a `url(#id)` reference.
 */
export const paintToSvgPaint = (
  paint: Paint,
  id: string,
  draft: Record<string, unknown>,
): { def: string; ref: string } => {
  if (paint.kind === "flat") {
    return { def: "", ref: resolveValue(paint.color, draft) ?? "transparent" };
  }
  const stopXml = paint.stops
    .map((s) => {
      const c = resolveValue(s.color, draft) ?? "#000000";
      return `<stop offset='${(s.position * 100).toFixed(2)}%' stop-color='${c}'/>`;
    })
    .join("");
  if (paint.kind === "linear") {
    const rad = (paint.angle * Math.PI) / 180;
    const x = Math.sin(rad);
    const y = -Math.cos(rad);
    const x1 = (0.5 - x / 2).toFixed(4);
    const y1 = (0.5 - y / 2).toFixed(4);
    const x2 = (0.5 + x / 2).toFixed(4);
    const y2 = (0.5 + y / 2).toFixed(4);
    return {
      def: `<linearGradient id='${id}' x1='${x1}' y1='${y1}' x2='${x2}' y2='${y2}'>${stopXml}</linearGradient>`,
      ref: `url(#${id})`,
    };
  }
  const cx = paint.cx.toFixed(4);
  const cy = paint.cy.toFixed(4);
  return {
    def: `<radialGradient id='${id}' cx='${cx}' cy='${cy}' r='0.7'>${stopXml}</radialGradient>`,
    ref: `url(#${id})`,
  };
};

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
  opacity: Value<number>;
  visible: boolean;
  locked: boolean;
}

export interface ImageShadow {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: Value<string>;
}

export interface ImageNode extends BaseNode {
  type: "image";
  src: Value<string>;
  fit: "cover" | "contain";
  cornerRadius: Value<number>;
  stroke: Paint;
  strokeWidth: Value<number>;
  shadow: ImageShadow | null;
}

export interface TextNode extends BaseNode {
  type: "text";
  text: Value<string>;
  fontSize: Value<number>;
  fontWeight: 400 | 500 | 600 | 700 | 800;
  italic: Value<boolean>;
  color: Paint;
  align: "left" | "center" | "right";
  fontFamily: "Inter";
  letterSpacing: Value<number>;
  lineHeight: Value<number>;
}

interface ShapeFields {
  fill: Paint;
  stroke: Paint;
  strokeWidth: Value<number>;
}

export interface RectangleNode extends BaseNode, ShapeFields {
  type: "rectangle";
  cornerRadius: Value<number>;
}

export interface EllipseNode extends BaseNode, ShapeFields {
  type: "ellipse";
}

export interface TriangleNode extends BaseNode, ShapeFields {
  type: "triangle";
}

export interface StarNode extends BaseNode, ShapeFields {
  type: "star";
  points: Value<number>;
  innerRadiusRatio: Value<number>;
}

export interface LineNode extends BaseNode {
  type: "line";
  stroke: Paint;
  strokeWidth: Value<number>;
  arrow: Value<boolean>;
}

export type EditorNode =
  | ImageNode
  | TextNode
  | RectangleNode
  | EllipseNode
  | TriangleNode
  | StarNode
  | LineNode;

export interface Artboard {
  width: number;
  height: number;
  background: Paint;
}

export interface TemplateDocument {
  artboard: Artboard;
  nodes: EditorNode[];
  paramsSchema: ParamsSchema;
}

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

const RESERVED_PARAMS = new Set(["format", "w", "q", "_sig", "_ts"]);

/**
 * Returns search-param keys that are neither declared in the schema nor in
 * the reserved set. Use this to 400-reject typoed callers in strict-mode
 * routes.
 */
export function findUnknownParams(
  search: URLSearchParams | string | null | undefined,
  schema: ParamsSchema,
): string[] {
  if (!search) return [];
  const sp =
    typeof search === "string" ? new URLSearchParams(search) : search;
  const declared = new Set(Object.keys(schema));
  const unknown: string[] = [];
  const seen = new Set<string>();
  for (const key of sp.keys()) {
    if (seen.has(key)) continue;
    seen.add(key);
    if (RESERVED_PARAMS.has(key)) continue;
    if (!declared.has(key)) unknown.push(key);
  }
  return unknown;
}

export function paramsFromSearch(
  search: URLSearchParams | string | null | undefined,
  schema: ParamsSchema,
): Record<string, unknown> {
  if (!search) return {};
  const sp =
    typeof search === "string" ? new URLSearchParams(search) : search;
  const out: Record<string, unknown> = {};
  for (const [name, entry] of Object.entries(schema)) {
    if (RESERVED_PARAMS.has(name)) continue;
    const raw = sp.get(name);
    if (raw === null) continue;
    switch (entry.kind) {
      case "string":
      case "url":
      case "color":
        out[name] = raw;
        break;
      case "number": {
        const n = Number(raw);
        if (Number.isFinite(n)) out[name] = n;
        break;
      }
      case "boolean":
        out[name] = raw === "1" || raw.toLowerCase() === "true";
        break;
      case "enum":
        if (entry.values.includes(raw)) out[name] = raw;
        break;
    }
  }
  return out;
}

export function searchFromParams(
  values: Record<string, unknown>,
  schema: ParamsSchema,
): URLSearchParams {
  const sp = new URLSearchParams();
  for (const [name, entry] of Object.entries(schema)) {
    const v = values[name];
    if (v === undefined || v === null || v === "") continue;
    switch (entry.kind) {
      case "string":
      case "url":
      case "color":
        if (typeof v === "string" && v.length > 0) sp.set(name, v);
        break;
      case "number":
        if (typeof v === "number" && Number.isFinite(v))
          sp.set(name, String(v));
        break;
      case "boolean":
        if (typeof v === "boolean") sp.set(name, v ? "1" : "0");
        break;
      case "enum":
        if (typeof v === "string" && entry.values.includes(v))
          sp.set(name, v);
        break;
    }
  }
  return sp;
}
