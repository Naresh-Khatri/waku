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
  PathNode,
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
  PathNode,
  RectangleNode,
  StarNode,
  TriangleNode,
} from "@waku/renderer/document";

export type ShapeNode =
  | RectangleNode
  | EllipseNode
  | TriangleNode
  | StarNode
  | PathNode;

export { paramsWithDefaults } from "@waku/renderer/document";
