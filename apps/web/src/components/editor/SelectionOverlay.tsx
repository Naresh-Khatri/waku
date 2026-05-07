"use client";

import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";
import type { Node } from "@waku/ir";

import { getNodeAt, parentPath, type NodePath } from "./path";
import { useEditorStore, useEditorStoreApi } from "./StoreProvider";

type Rect = { x: number; y: number; w: number; h: number };
type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type Guide = { axis: "x" | "y"; pos: number; from: number; to: number };

const DRAG_THRESHOLD = 3;
const SNAP_THRESHOLD = 5;

const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const SELECTION_COLOR = "#7c5cff";
const GUIDE_COLOR = "#22d3ee";
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
  const [guides, setGuides] = useState<Guide[]>([]);

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

  const onMoveStart = (
    e: React.PointerEvent<HTMLDivElement>,
    path: NodePath,
  ) => {
    if (e.button !== 0) return;
    if (path === "0") return;
    const container = containerRef.current;
    if (!container) return;

    const state = api.getState();
    const node = getNodeAt(state.ir, path);
    if (!node || node.type === "frame") return;
    const parent = parentPath(path);
    if (!parent) return;

    e.preventDefault();
    e.stopPropagation();

    const before = { ir: state.ir, paramsSchema: state.paramsSchema };
    const cRect = container.getBoundingClientRect();
    const scale = cRect.width / irW || 1;
    const rect = rects.get(path);
    if (!rect) return;

    // measure parent rect (in IR-space) to compute coordinates relative to it
    const parentEl = container.querySelector<HTMLElement>(
      `[data-node-id="${CSS.escape(parent)}"]`,
    );
    if (!parentEl) return;
    const pBox = parentEl.getBoundingClientRect();
    const parentX = (pBox.left - cRect.left) / scale;
    const parentY = (pBox.top - cRect.top) / scale;
    const parentW = pBox.width / scale;
    const parentH = pBox.height / scale;

    // measure all sibling rects (in IR-space, parent-relative) for snapping
    const parentNode = getNodeAt(state.ir, parent);
    const siblingRects: Rect[] = [];
    if (parentNode && (parentNode.type === "frame" || parentNode.type === "stack")) {
      const siblings = parentNode.children ?? [];
      for (let i = 0; i < siblings.length; i++) {
        const sibPath = `${parent}.children.${i}`;
        if (sibPath === path) continue;
        const sibEl = container.querySelector<HTMLElement>(
          `[data-node-id="${CSS.escape(sibPath)}"]`,
        );
        if (!sibEl) continue;
        const sb = sibEl.getBoundingClientRect();
        siblingRects.push({
          x: (sb.left - pBox.left) / scale,
          y: (sb.top - pBox.top) / scale,
          w: sb.width / scale,
          h: sb.height / scale,
        });
      }
    }

    // current x/y relative to parent
    const startNodeX = rect.x - parentX;
    const startNodeY = rect.y - parentY;
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    let dragging = false;

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const computeSnap = (px: number, py: number) => {
      const w = rect.w;
      const h = rect.h;
      const myEdgesX = [
        { type: "left", value: px },
        { type: "center", value: px + w / 2 },
        { type: "right", value: px + w },
      ];
      const myEdgesY = [
        { type: "top", value: py },
        { type: "middle", value: py + h / 2 },
        { type: "bottom", value: py + h },
      ];
      const targetsX: number[] = [0, parentW / 2, parentW];
      const targetsY: number[] = [0, parentH / 2, parentH];
      for (const sib of siblingRects) {
        targetsX.push(sib.x, sib.x + sib.w / 2, sib.x + sib.w);
        targetsY.push(sib.y, sib.y + sib.h / 2, sib.y + sib.h);
      }

      let bestX: { delta: number; pos: number } | null = null;
      for (const me of myEdgesX) {
        for (const t of targetsX) {
          const d = t - me.value;
          if (Math.abs(d) <= SNAP_THRESHOLD) {
            if (!bestX || Math.abs(d) < Math.abs(bestX.delta)) {
              bestX = { delta: d, pos: t };
            }
          }
        }
      }

      let bestY: { delta: number; pos: number } | null = null;
      for (const me of myEdgesY) {
        for (const t of targetsY) {
          const d = t - me.value;
          if (Math.abs(d) <= SNAP_THRESHOLD) {
            if (!bestY || Math.abs(d) < Math.abs(bestY.delta)) {
              bestY = { delta: d, pos: t };
            }
          }
        }
      }

      const snappedX = bestX ? px + bestX.delta : px;
      const snappedY = bestY ? py + bestY.delta : py;

      const drawn: Guide[] = [];
      if (bestX) {
        // span from min top among my+matched siblings to max bottom
        let from = snappedY;
        let to = snappedY + h;
        for (const sib of siblingRects) {
          const eq = (a: number, b: number) => Math.abs(a - b) < 0.5;
          if (
            eq(bestX.pos, sib.x) ||
            eq(bestX.pos, sib.x + sib.w / 2) ||
            eq(bestX.pos, sib.x + sib.w)
          ) {
            from = Math.min(from, sib.y);
            to = Math.max(to, sib.y + sib.h);
          }
        }
        drawn.push({ axis: "x", pos: bestX.pos, from, to });
      }
      if (bestY) {
        let from = snappedX;
        let to = snappedX + w;
        for (const sib of siblingRects) {
          const eq = (a: number, b: number) => Math.abs(a - b) < 0.5;
          if (
            eq(bestY.pos, sib.y) ||
            eq(bestY.pos, sib.y + sib.h / 2) ||
            eq(bestY.pos, sib.y + sib.h)
          ) {
            from = Math.min(from, sib.x);
            to = Math.max(to, sib.x + sib.w);
          }
        }
        drawn.push({ axis: "y", pos: bestY.pos, from, to });
      }

      return { x: snappedX, y: snappedY, guides: drawn };
    };

    const onMoveEv = (ev: PointerEvent) => {
      const dx = (ev.clientX - startClientX) / scale;
      const dy = (ev.clientY - startClientY) / scale;
      if (!dragging && Math.hypot(ev.clientX - startClientX, ev.clientY - startClientY) < DRAG_THRESHOLD) {
        return;
      }
      dragging = true;
      const rawX = startNodeX + dx;
      const rawY = startNodeY + dy;
      const snap = computeSnap(rawX, rawY);
      const fresh = api.getState();
      const current = getNodeAt(fresh.ir, path);
      if (!current || current.type === "frame") return;
      const next = {
        ...current,
        x: Math.round(snap.x),
        y: Math.round(snap.y),
      } as Node;
      fresh.liveSetNode(path, next);
      setGuides(snap.guides);
    };

    const onUp = () => {
      try {
        target.releasePointerCapture(e.pointerId);
      } catch {
        // already released
      }
      window.removeEventListener("pointermove", onMoveEv);
      window.removeEventListener("pointerup", onUp);
      setGuides([]);
      if (dragging) api.getState().commitTransform(before);
    };

    window.addEventListener("pointermove", onMoveEv);
    window.addEventListener("pointerup", onUp);
  };

  if (selection.length === 0 && guides.length === 0) return null;

  // Resolve parent rect for each selected path so guides can render in canvas-space
  const guideAnchor = (path: NodePath): { x: number; y: number } | null => {
    const container = containerRef.current;
    if (!container) return null;
    const parent = parentPath(path);
    if (!parent) return null;
    const cRect = container.getBoundingClientRect();
    const scale = cRect.width / irW || 1;
    const parentEl = container.querySelector<HTMLElement>(
      `[data-node-id="${CSS.escape(parent)}"]`,
    );
    if (!parentEl) return null;
    const pBox = parentEl.getBoundingClientRect();
    return {
      x: (pBox.left - cRect.left) / scale,
      y: (pBox.top - cRect.top) / scale,
    };
  };

  const focusPath = selection[0];
  const anchor = focusPath ? guideAnchor(focusPath) : null;

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
        const canMove = path !== "0" && node.type !== "frame";
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
            {canMove && (
              <div
                onPointerDown={(e) => onMoveStart(e, path)}
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
      {anchor &&
        guides.map((g, i) => {
          if (g.axis === "x") {
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: anchor.x + g.pos - 0.5,
                  top: anchor.y + g.from,
                  width: 1,
                  height: g.to - g.from,
                  background: GUIDE_COLOR,
                  pointerEvents: "none",
                }}
              />
            );
          }
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: anchor.x + g.from,
                top: anchor.y + g.pos - 0.5,
                width: g.to - g.from,
                height: 1,
                background: GUIDE_COLOR,
                pointerEvents: "none",
              }}
            />
          );
        })}
    </div>
  );
}
