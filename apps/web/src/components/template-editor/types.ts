export type NodeType =
  | "image"
  | "text"
  | "rectangle"
  | "ellipse"
  | "triangle"
  | "star"
  | "line";

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
  src: string;
  fit: "cover" | "contain";
}

export interface TextNode extends BaseNode {
  type: "text";
  text: string;
  fontSize: number;
  fontWeight: 400 | 500 | 600 | 700 | 800;
  italic: boolean;
  color: string;
  align: "left" | "center" | "right";
  fontFamily: string;
  letterSpacing: number;
  lineHeight: number;
}

interface ShapeBase extends BaseNode {
  fill: string;
  stroke: string;
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
  stroke: string;
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
  background: string;
}
