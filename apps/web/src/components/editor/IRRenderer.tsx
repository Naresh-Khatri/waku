"use client";

import {
  alignToCss,
  fillToCss,
  gradientToCss,
  justifyToCss,
  padToCss,
  sizeToCss,
} from "@waku/renderer/css";
import type {
  FrameNode,
  GradientNode,
  ImageNode,
  Node,
  ShapeNode,
  StackNode,
  TextNode,
} from "@waku/ir";
import type { CSSProperties, ReactElement } from "react";

/**
 * Editor preview tree. Mirrors packages/renderer/src/satori-tree.ts so the
 * canvas matches the rendered image at the structural CSS level.
 *
 * Inputs MUST be fully param-resolved (no ParamRef nodes) — call resolve()
 * from @waku/ir with editor mock values before passing here.
 *
 * Each node carries a `data-node-id` path (e.g. "0.children.1.children.0")
 * stable across re-renders for a given tree shape; selection state keys off it.
 */

export const ROOT_ID = "0";

const childId = (parent: string, idx: number) => `${parent}.children.${idx}`;

type NodeProps = {
  node: Node;
  id: string;
};

export function IRRenderer({ ir }: { ir: Node }): ReactElement {
  return <NodeRenderer node={ir} id={ROOT_ID} />;
}

function NodeRenderer({ node, id }: NodeProps): ReactElement {
  switch (node.type) {
    case "frame":
      return <FrameRenderer node={node} id={id} />;
    case "stack":
      return <StackRenderer node={node} id={id} />;
    case "text":
      return <TextRenderer node={node} id={id} />;
    case "image":
      return <ImageRenderer node={node} id={id} />;
    case "shape":
      return <ShapeRenderer node={node} id={id} />;
    case "gradient":
      return <GradientRenderer node={node} id={id} />;
  }
}

function renderChildren(
  children: Node[] | undefined,
  parentId: string,
): ReactElement[] {
  return (children ?? []).map((child, i) => (
    <NodeRenderer key={childId(parentId, i)} node={child} id={childId(parentId, i)} />
  ));
}

function FrameRenderer({ node, id }: { node: FrameNode; id: string }): ReactElement {
  const style: CSSProperties = {
    display: "flex",
    width: node.w,
    height: node.h,
    position: "relative",
    ...fillToCss(node.bg),
  };
  return (
    <div data-node-id={id} data-node-type="frame" style={style}>
      {renderChildren(node.children, id)}
    </div>
  );
}

function StackRenderer({ node, id }: { node: StackNode; id: string }): ReactElement {
  const style: CSSProperties = {
    display: "flex",
    flexDirection: node.dir === "row" ? "row" : "column",
    gap: node.gap ?? 0,
    ...padToCss(node.pad),
    ...sizeToCss(node.w, "width"),
    ...sizeToCss(node.h, "height"),
    ...fillToCss(node.bg),
  };
  const align = alignToCss(node.align);
  if (align) style.alignItems = align as CSSProperties["alignItems"];
  const justify = justifyToCss(node.justify);
  if (justify) style.justifyContent = justify as CSSProperties["justifyContent"];
  if (node.radius !== undefined) style.borderRadius = node.radius;
  return (
    <div data-node-id={id} data-node-type="stack" style={style}>
      {renderChildren(node.children, id)}
    </div>
  );
}

function TextRenderer({ node, id }: { node: TextNode; id: string }): ReactElement {
  if (typeof node.value !== "string" || typeof node.color !== "string") {
    throw new Error("IRRenderer: text.value/color must be resolved before render");
  }
  const style: CSSProperties = {
    fontFamily: node.font.family,
    fontSize: node.size,
    color: node.color,
    fontWeight: node.weight ?? node.font.weight ?? 400,
    fontStyle: node.font.style ?? "normal",
    lineHeight: node.lineHeight ?? 1.2,
  };
  if (node.tracking !== undefined) style.letterSpacing = node.tracking;
  if (node.align) style.textAlign = node.align;
  if (node.maxLines !== undefined) {
    style.display = "-webkit-box";
    (style as Record<string, unknown>).WebkitBoxOrient = "vertical";
    (style as Record<string, unknown>).WebkitLineClamp = node.maxLines;
    style.overflow = "hidden";
  }
  return (
    <div data-node-id={id} data-node-type="text" style={style}>
      {node.value}
    </div>
  );
}

function ImageRenderer({ node, id }: { node: ImageNode; id: string }): ReactElement {
  if (typeof node.src !== "string") {
    throw new Error("IRRenderer: image.src must be resolved before render");
  }
  const style: CSSProperties = {
    objectFit: node.fit,
    display: "block",
  };
  if (node.w !== undefined) style.width = node.w;
  if (node.h !== undefined) style.height = node.h;
  if (node.radius !== undefined) style.borderRadius = node.radius;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      data-node-id={id}
      data-node-type="image"
      src={node.src}
      alt=""
      style={style}
    />
  );
}

function ShapeRenderer({ node, id }: { node: ShapeNode; id: string }): ReactElement {
  const style: CSSProperties = {
    width: node.w,
    height: node.h,
    ...fillToCss(node.fill),
  };
  if (node.kind === "circle") style.borderRadius = Math.max(node.w, node.h);
  else if (node.radius !== undefined) style.borderRadius = node.radius;
  return <div data-node-id={id} data-node-type="shape" style={style} />;
}

function GradientRenderer({ node, id }: { node: GradientNode; id: string }): ReactElement {
  const style: CSSProperties = {
    width: node.w,
    height: node.h,
    background: gradientToCss(node.gradient),
  };
  if (node.radius !== undefined) style.borderRadius = node.radius;
  return <div data-node-id={id} data-node-type="gradient" style={style} />;
}
