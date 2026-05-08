export type {
  Artboard,
  BaseNode,
  ColorStop,
  EditorNode,
  EllipseNode,
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
  flatPaint,
  isFlatPaint,
  isParamRef,
  paintToCss,
  paintToSvgPaint,
  resolveValue,
} from "@waku/renderer/document";

import type {
  EllipseNode,
  RectangleNode,
  StarNode,
  TriangleNode,
} from "@waku/renderer/document";

export type ShapeNode = RectangleNode | EllipseNode | TriangleNode | StarNode;
