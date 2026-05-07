"use client";

import type { Node } from "@waku/ir";

import { useEditorStore, useEditorStoreApi } from "./StoreProvider";
import { getNodeAt, type NodePath } from "./path";

const blank = {
  text: (): Node => ({
    type: "text",
    value: "Hello",
    font: { family: "Inter" },
    size: 64,
    color: "#ffffff",
  }),
  rect: (): Node => ({
    type: "shape",
    kind: "rect",
    w: 200,
    h: 100,
    fill: "#7c5cff",
    radius: 12,
  }),
  circle: (): Node => ({
    type: "shape",
    kind: "circle",
    w: 100,
    h: 100,
    fill: "#22c55e",
  }),
  image: (): Node => ({
    type: "image",
    src: "https://placehold.co/600x400",
    fit: "cover",
    w: 300,
    h: 200,
    radius: 8,
  }),
  stack: (): Node => ({
    type: "stack",
    dir: "col",
    gap: 12,
    pad: 12,
    children: [],
  }),
  gradient: (): Node => ({
    type: "gradient",
    w: 400,
    h: 200,
    gradient: {
      type: "linear",
      angle: 90,
      stops: [
        { color: "#7c5cff", offset: 0 },
        { color: "#22c55e", offset: 1 },
      ],
    },
  }),
};

export function InsertBar() {
  const api = useEditorStoreApi();
  const selection = useEditorStore((s) => s.selection);
  const previewMode = useEditorStore((s) => s.previewMode);
  const addNode = useEditorStore((s) => s.addNode);
  const select = useEditorStore((s) => s.select);

  if (previewMode) return null;

  const insert = (factory: () => Node) => {
    const node = factory();
    const state = api.getState();

    let parent: NodePath = "0";
    let index = 0;

    const focus = selection[0];
    if (focus) {
      const focusNode = getNodeAt(state.ir, focus);
      if (focusNode?.type === "frame" || focusNode?.type === "stack") {
        parent = focus;
        index = (focusNode.children ?? []).length;
      } else {
        // sibling insert: same parent, after focus
        const segs = focus.split(".");
        const idx = Number(segs.pop());
        segs.pop(); // drop "children"
        parent = segs.join(".");
        index = idx + 1;
      }
    } else if (state.ir.type === "frame" || state.ir.type === "stack") {
      index = (state.ir.children ?? []).length;
    }

    addNode(parent, index, node);
    select(`${parent}.children.${index}`);
  };

  return (
    <div
      style={{
        display: "inline-flex",
        gap: 4,
        padding: 4,
        background: "#0b0f1aE6",
        border: "1px solid #1f2937",
        borderRadius: 8,
        backdropFilter: "blur(8px)",
      }}
    >
      <Btn onClick={() => insert(blank.text)} title="Text">T</Btn>
      <Btn onClick={() => insert(blank.rect)} title="Rectangle">▭</Btn>
      <Btn onClick={() => insert(blank.circle)} title="Circle">●</Btn>
      <Btn onClick={() => insert(blank.image)} title="Image">🖼</Btn>
      <Btn onClick={() => insert(blank.stack)} title="Stack">⊟</Btn>
      <Btn onClick={() => insert(blank.gradient)} title="Gradient">▧</Btn>
    </div>
  );
}

function Btn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 28,
        height: 28,
        background: "transparent",
        color: "#e5e7eb",
        border: "1px solid #1f2937",
        borderRadius: 6,
        cursor: "pointer",
        fontSize: 13,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}
