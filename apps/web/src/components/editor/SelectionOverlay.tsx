"use client";

import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";
import type { Node } from "@waku/ir";

import { getNodeAt, type NodePath } from "./path";
import { useEditorStore, useEditorStoreApi } from "./StoreProvider";

type Rect = { x: number; y: number; w: number; h: number };
type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const SELECTION_COLOR = "#7c5cff";
const HANDLE_SIZE = 10;

const supportsResize = (node: Node): boolean => {
  switch (node.type) {
    case "frame":
    case "shape":
    case "gradient":
      return true;
    case "stack":
    case "image":
      return typeof node.w === "number" && typeof node.h === "number";
    case "text":
      return false;
  }
};

const handleStyle = (h: Handle): CSSProperties => {
  const base: CSSProperties = {
    position: "absolute",
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    background: "#ffffff",
    border: `1.5px solid ${SELECTION_COLOR}`,
    borderRadius: 2,
    boxSizing: "border-box",
    pointerEvents: "auto",
  };
  const half = HANDLE_SIZE / 2;
  const cursor: Record<Handle, string> = {
    nw: "nwse-resize",
    n: "ns-resize",
    ne: "nesw-resize",
    e: "ew-resize",
    se: "nwse-resize",
    s: "ns-resize",
    sw: "nesw-resize",
    w: "ew-resize",
  };
  base.cursor = cursor[h];
  if (h === "nw") return { ...base, top: -half, left: -half };
  if (h === "n") return { ...base, top: -half, left: `calc(50% - ${half}px)` };
  if (h === "ne") return { ...base, top: -half, right: -half };
  if (h === "e") return { ...base, top: `calc(50% - ${half}px)`, right: -half };
  if (h === "se") return { ...base, bottom: -half, right: -half };
  if (h === "s") return { ...base, bottom: -half, left: `calc(50% - ${half}px)` };
  if (h === "sw") return { ...base, bottom: -half, left: -half };
  return { ...base, top: `calc(50% - ${half}px)`, left: -half };
};

export function SelectionOverlay({
  containerRef,
  irW,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  irW: number;
}) {
  const ir = useEditorStore((s) => s.ir);
  const selection = useEditorStore((s) => s.selection);
  const api = useEditorStoreApi();
  const [rects, setRects] = useState<Map<NodePath, Rect>>(new Map());

  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const scale = cRect.width / irW || 1;
      const next = new Map<NodePath, Rect>();
      for (const path of selection) {
        const el = container.querySelector<HTMLElement>(
          `[data-node-id="${CSS.escape(path)}"]`,
        );
        if (!el) continue;
        const r = el.getBoundingClientRect();
        next.set(path, {
          x: (r.left - cRect.left) / scale,
          y: (r.top - cRect.top) / scale,
          w: r.width / scale,
          h: r.height / scale,
        });
      }
      setRects(next);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [containerRef, irW, ir, selection]);

  const onResizeStart = (
    e: React.PointerEvent<HTMLDivElement>,
    path: NodePath,
    handle: Handle,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const state = api.getState();
    const node = getNodeAt(state.ir, path);
    if (!node) return;
    if (!supportsResize(node)) return;
    const container = containerRef.current;
    if (!container) return;

    const before = { ir: state.ir, paramsSchema: state.paramsSchema };
    const cRect = container.getBoundingClientRect();
    const scale = cRect.width / irW || 1;
    const rect = rects.get(path);
    if (!rect) return;
    const startW = rect.w;
    const startH = rect.h;
    const startX = e.clientX;
    const startY = e.clientY;

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      let dw = 0;
      let dh = 0;
      if (handle.includes("e")) dw = dx;
      if (handle.includes("w")) dw = -dx;
      if (handle.includes("s")) dh = dy;
      if (handle.includes("n")) dh = -dy;
      const newW = Math.max(1, Math.round(startW + dw));
      const newH = Math.max(1, Math.round(startH + dh));
      const fresh = api.getState();
      const current = getNodeAt(fresh.ir, path);
      if (!current) return;
      const next = { ...current, w: newW, h: newH } as Node;
      fresh.liveSetNode(path, next);
    };

    const onUp = () => {
      try {
        target.releasePointerCapture(e.pointerId);
      } catch {
        // pointer may have already been released
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      api.getState().commitTransform(before);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (selection.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      {[...rects.entries()].map(([path, rect]) => {
        const node = getNodeAt(ir, path);
        if (!node) return null;
        const canResize = supportsResize(node);
        return (
          <div
            key={path}
            style={{
              position: "absolute",
              left: rect.x,
              top: rect.y,
              width: rect.w,
              height: rect.h,
              outline: `2px solid ${SELECTION_COLOR}`,
              outlineOffset: -1,
              boxSizing: "border-box",
              pointerEvents: "none",
            }}
          >
            {canResize &&
              HANDLES.map((h) => (
                <div
                  key={h}
                  onPointerDown={(e) => onResizeStart(e, path, h)}
                  style={handleStyle(h)}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}
