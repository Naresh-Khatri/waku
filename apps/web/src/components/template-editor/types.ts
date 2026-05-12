export type {
  Artboard,
  BaseNode,
  ColorStop,
  EditorNode,
  EllipseNode,
  FontFamily,
  ImageNode,
  ImageShadow,
  Shadow,
  LineNode,
  NodeType,
  Paint,
  ParamKind,
  ParamRef,
  ParamSchemaEntry,
  ParamsSchema,
  RectangleNode,
  StarNode,
  TemplateDocument,
  TextNode,
  TriangleNode,
  Value,
} from "@waku/renderer/document";
export {
  FONT_FAMILY_VALUES,
  flatPaint,
  isFlatPaint,
  isParamRef,
  paintToCss,
  paintToSvgPaint,
  resolveValue,
} from "@waku/renderer/document";

import type {
  EllipseNode,
  ParamsSchema,
  RectangleNode,
  StarNode,
  TriangleNode,
} from "@waku/renderer/document";

export type ShapeNode = RectangleNode | EllipseNode | TriangleNode | StarNode;

export function effectiveParams(
  schema: ParamsSchema,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...values };
  for (const [name, entry] of Object.entries(schema)) {
    const v = out[name];
    if (v !== undefined && v !== null && v !== "") continue;
    if ("default" in entry && entry.default !== undefined) {
      out[name] = entry.default;
    } else if (entry.kind === "enum" && entry.values.length > 0) {
      out[name] = entry.values[0];
    }
  }
  return out;
}
