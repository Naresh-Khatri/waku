export type {
  Artboard,
  BaseNode,
  EditorNode,
  EllipseNode,
  ImageNode,
  LineNode,
  NodeType,
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
export { isParamRef, resolveValue } from "@waku/renderer/document";

import type {
  EllipseNode,
  RectangleNode,
  StarNode,
  TriangleNode,
} from "@waku/renderer/document";

export type ShapeNode = RectangleNode | EllipseNode | TriangleNode | StarNode;

export type BindableField =
  | { type: "text"; field: "text"; kind: "string" }
  | { type: "text"; field: "color"; kind: "color" }
  | { type: "image"; field: "src"; kind: "url" }
  | {
      type: "rectangle" | "ellipse" | "triangle" | "star";
      field: "fill";
      kind: "color";
    }
  | {
      type: "rectangle" | "ellipse" | "triangle" | "star";
      field: "stroke";
      kind: "color";
    }
  | { type: "line"; field: "stroke"; kind: "color" };
