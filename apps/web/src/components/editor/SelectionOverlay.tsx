"use client";

import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";
import type { Node } from "@waku/ir";

import { getNodeAt, parentPath, type NodePath } from "./path";
import { useEditorStore, useEditorStoreApi } from "./StoreProvider";

type Rect = { x: number; y: number; w: number; h: number };
type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type DropIndicator = { parent: NodePath; index: number; rect: Rect; dir: "row" | "col" };

const DRAG_THRESHOLD = 4;

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
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);

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

  const onReorderStart = (
    e: React.PointerEvent<HTMLDivElement>,
    path: NodePath,
  ) => {
    if (e.button !== 0) return;
    const parent = parentPath(path);
    if (!parent) return;
    const state = api.getState();
    const parentNode = getNodeAt(state.ir, parent);
    if (!parentNode || parentNode.type !== "stack") return;
    const container = containerRef.current;
    if (!container) return;

    e.preventDefault();
    e.stopPropagation();
    const cRect = container.getBoundingClientRect();
    const scale = cRect.width / irW || 1;

    const siblingsRects: Rect[] = [];
    const siblings = parentNode.children ?? [];
    const fromIdx = Number(path.split(".").pop());
    for (let i = 0; i < siblings.length; i++) {
      const childPath = `${parent}.children.${i}`;
      const el = container.querySelector<HTMLElement>(
        `[data-node-id="${CSS.escape(childPath)}"]`,
      );
      if (!el) {
        siblingsRects.push({ x: 0, y: 0, w: 0, h: 0 });
        continue;
      }
      const r = el.getBoundingClientRect();
      siblingsRects.push({
        x: (r.left - cRect.left) / scale,
        y: (r.top - cRect.top) / scale,
        w: r.width / scale,
        h: r.height / scale,
      });
    }

    const dir: "row" | "col" = parentNode.dir === "row" ? "row" : "col";
    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;
    let chosenIndex = fromIdx;

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const at = (i: number): Rect => {
      const r = siblingsRects[i];
      if (!r) throw new Error(`sibling rect ${i} missing`);
      return r;
    };

    const computeIndex = (clientX: number, clientY: number): number => {
      const ptX = (clientX - cRect.left) / scale;
      const ptY = (clientY - cRect.top) / scale;
      const pt = dir === "row" ? ptX : ptY;
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i <= siblingsRects.length; i++) {
        let boundary: number;
        if (siblingsRects.length === 0) {
          boundary = 0;
        } else if (i === 0) {
          const r = at(0);
          boundary = dir === "row" ? r.x : r.y;
        } else if (i === siblingsRects.length) {
          const r = at(i - 1);
          boundary = dir === "row" ? r.x + r.w : r.y + r.h;
        } else {
          const a = at(i - 1);
          const b = at(i);
          boundary =
            dir === "row" ? (a.x + a.w + b.x) / 2 : (a.y + a.h + b.y) / 2;
        }
        const d = Math.abs(pt - boundary);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    };

    const indicatorRect = (index: number): Rect => {
      const stride = 3;
      if (siblingsRects.length === 0) {
        const parentEl = container.querySelector<HTMLElement>(
          `[data-node-id="${CSS.escape(parent)}"]`,
        );
        if (!parentEl) return { x: 0, y: 0, w: 0, h: 0 };
        const r = parentEl.getBoundingClientRect();
        return {
          x: (r.left - cRect.left) / scale,
          y: (r.top - cRect.top) / scale,
          w: dir === "row" ? stride : r.width / scale,
          h: dir === "row" ? r.height / scale : stride,
        };
      }
      let x: number;
      let y: number;
      let w: number;
      let h: number;
      if (index === 0) {
        const r = at(0);
        if (dir === "row") {
          x = r.x - stride / 2;
          y = r.y;
          w = stride;
          h = r.h;
        } else {
          x = r.x;
          y = r.y - stride / 2;
          w = r.w;
          h = stride;
        }
      } else if (index === siblingsRects.length) {
        const r = at(index - 1);
        if (dir === "row") {
          x = r.x + r.w - stride / 2;
          y = r.y;
          w = stride;
          h = r.h;
        } else {
          x = r.x;
          y = r.y + r.h - stride / 2;
          w = r.w;
          h = stride;
        }
      } else {
        const a = at(index - 1);
        const b = at(index);
        if (dir === "row") {
          x = (a.x + a.w + b.x) / 2 - stride / 2;
          y = Math.min(a.y, b.y);
          w = stride;
          h = Math.max(a.h, b.h);
        } else {
          x = Math.min(a.x, b.x);
          y = (a.y + a.h + b.y) / 2 - stride / 2;
          w = Math.max(a.w, b.w);
          h = stride;
        }
      }
      return { x, y, w, h };
    };

    const onMove = (ev: PointerEvent) => {
      if (!dragging) {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        dragging = true;
      }
      chosenIndex = computeIndex(ev.clientX, ev.clientY);
      setDropIndicator({
        parent,
        index: chosenIndex,
        rect: indicatorRect(chosenIndex),
        dir,
      });
    };

    const onUp = () => {
      try {
        target.releasePointerCapture(e.pointerId);
      } catch {
        // pointer may have already been released
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDropIndicator(null);
      if (dragging && chosenIndex !== fromIdx && chosenIndex !== fromIdx + 1) {
        api.getState().moveNode(path, parent, chosenIndex);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const isStackChild = (path: NodePath): boolean => {
    const parent = parentPath(path);
    if (!parent) return false;
    const parentNode = getNodeAt(ir, parent);
    return parentNode?.type === "stack";
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
        const canReorder = isStackChild(path);
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
            {canReorder && (
              <div
                onPointerDown={(e) => onReorderStart(e, path)}
                style={{
                  position: "absolute",
                  inset: 0,
                  cursor: "move",
                  pointerEvents: "auto",
                }}
              />
            )}
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
      {dropIndicator && (
        <div
          style={{
            position: "absolute",
            left: dropIndicator.rect.x,
            top: dropIndicator.rect.y,
            width: dropIndicator.rect.w,
            height: dropIndicator.rect.h,
            background: "#22c55e",
            borderRadius: 1,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}
