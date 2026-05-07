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

type Ctx = {
  selectedIds: Set<string>;
};

type NodeProps = {
  node: Node;
  id: string;
  ctx: Ctx;
};

export function IRRenderer({
  ir,
  selectedIds,
}: {
  ir: Node;
  selectedIds?: string[] | Set<string>;
}): ReactElement {
  const ctx: Ctx = {
    selectedIds:
      selectedIds instanceof Set
        ? selectedIds
        : new Set(selectedIds ?? []),
  };
  return <NodeRenderer node={ir} id={ROOT_ID} ctx={ctx} />;
}

function NodeRenderer({ node, id, ctx }: NodeProps): ReactElement {
  switch (node.type) {
    case "frame":
      return <FrameRenderer node={node} id={id} ctx={ctx} />;
    case "stack":
      return <StackRenderer node={node} id={id} ctx={ctx} />;
    case "text":
      return <TextRenderer node={node} id={id} ctx={ctx} />;
    case "image":
      return <ImageRenderer node={node} id={id} ctx={ctx} />;
    case "shape":
      return <ShapeRenderer node={node} id={id} ctx={ctx} />;
    case "gradient":
      return <GradientRenderer node={node} id={id} ctx={ctx} />;
  }
}

function renderChildren(
  children: Node[] | undefined,
  parentId: string,
  ctx: Ctx,
): ReactElement[] {
  return (children ?? []).map((child, i) => (
    <NodeRenderer
      key={childId(parentId, i)}
      node={child}
      id={childId(parentId, i)}
      ctx={ctx}
    />
  ));
}

const sel = (id: string, ctx: Ctx) =>
  ctx.selectedIds.has(id) ? "true" : undefined;

const positionStyle = (n: { x?: number; y?: number }): CSSProperties =>
  typeof n.x === "number" && typeof n.y === "number"
    ? { position: "absolute", left: n.x, top: n.y }
    : {};

const containerHasPositionedChild = (children: Node[] | undefined): boolean =>
  !!children?.some(
    (c) => c.type !== "frame" && typeof c.x === "number" && typeof c.y === "number",
  );

function FrameRenderer({ node, id, ctx }: { node: FrameNode; id: string; ctx: Ctx }): ReactElement {
  const style: CSSProperties = {
    display: "flex",
    width: node.w,
    height: node.h,
    position: "relative",
    ...fillToCss(node.bg),
  };
  return (
    <div data-node-id={id} data-node-type="frame" data-selected={sel(id, ctx)} style={style}>
      {renderChildren(node.children, id, ctx)}
    </div>
  );
}

function StackRenderer({ node, id, ctx }: { node: StackNode; id: string; ctx: Ctx }): ReactElement {
  const style: CSSProperties = {
    display: "flex",
    flexDirection: node.dir === "row" ? "row" : "column",
    gap: node.gap ?? 0,
    ...padToCss(node.pad),
    ...sizeToCss(node.w, "width"),
    ...sizeToCss(node.h, "height"),
    ...fillToCss(node.bg),
    ...positionStyle(node),
  };
  if (containerHasPositionedChild(node.children)) style.position = "relative";
  const align = alignToCss(node.align);
  if (align) style.alignItems = align as CSSProperties["alignItems"];
  const justify = justifyToCss(node.justify);
  if (justify) style.justifyContent = justify as CSSProperties["justifyContent"];
  if (node.radius !== undefined) style.borderRadius = node.radius;
  return (
    <div data-node-id={id} data-node-type="stack" data-selected={sel(id, ctx)} style={style}>
      {renderChildren(node.children, id, ctx)}
    </div>
  );
}

function TextRenderer({ node, id, ctx }: { node: TextNode; id: string; ctx: Ctx }): ReactElement {
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
    ...positionStyle(node),
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
    <div data-node-id={id} data-node-type="text" data-selected={sel(id, ctx)} style={style}>
      {node.value}
    </div>
  );
}

function ImageRenderer({ node, id, ctx }: { node: ImageNode; id: string; ctx: Ctx }): ReactElement {
  if (typeof node.src !== "string") {
    throw new Error("IRRenderer: image.src must be resolved before render");
  }
  const style: CSSProperties = {
    objectFit: node.fit,
    display: "block",
    ...positionStyle(node),
  };
  if (node.w !== undefined) style.width = node.w;
  if (node.h !== undefined) style.height = node.h;
  if (node.radius !== undefined) style.borderRadius = node.radius;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      data-node-id={id}
      data-node-type="image"
      data-selected={sel(id, ctx)}
      src={node.src}
      alt=""
      style={style}
    />
  );
}

function ShapeRenderer({ node, id, ctx }: { node: ShapeNode; id: string; ctx: Ctx }): ReactElement {
  const style: CSSProperties = {
    width: node.w,
    height: node.h,
    ...fillToCss(node.fill),
    ...positionStyle(node),
  };
  if (node.kind === "circle") style.borderRadius = Math.max(node.w, node.h);
  else if (node.radius !== undefined) style.borderRadius = node.radius;
  return <div data-node-id={id} data-node-type="shape" data-selected={sel(id, ctx)} style={style} />;
}

function GradientRenderer({ node, id, ctx }: { node: GradientNode; id: string; ctx: Ctx }): ReactElement {
  const style: CSSProperties = {
    width: node.w,
    height: node.h,
    background: gradientToCss(node.gradient),
    ...positionStyle(node),
  };
  if (node.radius !== undefined) style.borderRadius = node.radius;
  return <div data-node-id={id} data-node-type="gradient" data-selected={sel(id, ctx)} style={style} />;
}
