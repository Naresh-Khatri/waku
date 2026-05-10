"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useEditor } from "./store";
import type { Guide, Zoom } from "./store";
import { snapMove } from "./snap";
import type { EditorNode } from "./types";
import { effectiveParams, paintToCss, resolveValue } from "./types";
import { NodeContent } from "./node-view";
import { FloatingToolbar } from "./floating-toolbar";
import { ZoomBar } from "./zoom-bar";

type DragMode = "move" | "nw" | "ne" | "sw" | "se";

interface DragState {
  mode: DragMode;
  id: string;
  startClientX: number;
  startClientY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
  lastX: number;
  lastY: number;
  lastW: number;
  lastH: number;
  moved: boolean;
  el: HTMLElement | null;
}

function sameGuides(a: Guide[], b: Guide[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.axis !== b[i]!.axis || a[i]!.position !== b[i]!.position)
      return false;
  }
  return true;
}

const MIN_SIZE = 8;
const STAGE_PADDING = 96;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 8;

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

export function Canvas() {
  const artboard = useEditor((s) => s.artboard);
  const nodes = useEditor((s) => s.nodes);
  const selectedId = useEditor((s) => s.selectedId);
  const zoom = useEditor((s) => s.zoom);
  const select = useEditor((s) => s.select);
  const updateNode = useEditor((s) => s.updateNode);
  const setZoom = useEditor((s) => s.setZoom);
  const draftValues = useEditor((s) => s.draftValues);
  const paramsSchema = useEditor((s) => s.paramsSchema);
  const draft = effectiveParams(paramsSchema, draftValues);
  const artboardBg = paintToCss(artboard.background, draft);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectionFrameRef = useRef<HTMLDivElement>(null);
  const toolbarWrapRef = useRef<HTMLDivElement>(null);
  const [wrapperSize, setWrapperSize] = useState({ w: 0, h: 0 });
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const dragRef = useRef<DragState | null>(null);
  const panRef = useRef<{
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    moved: boolean;
  } | null>(null);
  const [panning, setPanning] = useState(false);
  const stageRef = useRef({ artLeft: 0, artTop: 0, scale: 1 });
  const pendingScrollRef = useRef<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setWrapperSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitScale =
    wrapperSize.w && wrapperSize.h
      ? Math.max(
          MIN_ZOOM,
          Math.min(
            (wrapperSize.w - STAGE_PADDING * 2) / artboard.width,
            (wrapperSize.h - STAGE_PADDING * 2) / artboard.height,
            1,
          ),
        )
      : 1;
  const scale = zoom === "fit" ? fitScale : zoom;

  const scaledW = artboard.width * scale;
  const scaledH = artboard.height * scale;
  const stageW = Math.max(wrapperSize.w, scaledW + STAGE_PADDING * 2);
  const stageH = Math.max(wrapperSize.h, scaledH + STAGE_PADDING * 2);
  const artLeft = (stageW - scaledW) / 2;
  const artTop = (stageH - scaledH) / 2;
  stageRef.current = { artLeft, artTop, scale };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const pan = panRef.current;
      if (pan) {
        const px = e.clientX - pan.startX;
        const py = e.clientY - pan.startY;
        if (!pan.moved && Math.hypot(px, py) < 3) return;
        if (!pan.moved) setPanning(true);
        pan.moved = true;
        const wrapper = wrapperRef.current;
        if (wrapper) {
          wrapper.scrollLeft = pan.scrollLeft - px;
          wrapper.scrollTop = pan.scrollTop - py;
        }
        return;
      }
      const drag = dragRef.current;
      if (!drag) return;
      const dx = (e.clientX - drag.startClientX) / scale;
      const dy = (e.clientY - drag.startClientY) / scale;
      if (!drag.moved && Math.hypot(dx, dy) < 1) return;
      drag.moved = true;

      const state = useEditor.getState();
      const node = state.nodes.find((n) => n.id === drag.id);
      if (!node) return;

      if (drag.mode === "move") {
        const others = state.nodes.filter((n) => n.id !== drag.id);
        const result = snapMove(
          {
            x: drag.origX + dx,
            y: drag.origY + dy,
            width: drag.origW,
            height: drag.origH,
          },
          others,
          state.artboard,
        );
        drag.lastX = result.x;
        drag.lastY = result.y;
        const tx = result.x - drag.origX;
        const ty = result.y - drag.origY;
        if (drag.el) drag.el.style.translate = `${tx}px ${ty}px`;
        if (selectionFrameRef.current) {
          selectionFrameRef.current.style.translate = `${tx * scale}px ${ty * scale}px`;
        }
        setGuides((prev) =>
          sameGuides(prev, result.guides) ? prev : result.guides,
        );
        return;
      }

      let nx = drag.origX;
      let ny = drag.origY;
      let nw = drag.origW;
      let nh = drag.origH;
      if (drag.mode === "nw" || drag.mode === "sw") {
        nx = drag.origX + dx;
        nw = drag.origW - dx;
      }
      if (drag.mode === "ne" || drag.mode === "se") {
        nw = drag.origW + dx;
      }
      if (drag.mode === "nw" || drag.mode === "ne") {
        ny = drag.origY + dy;
        nh = drag.origH - dy;
      }
      if (drag.mode === "sw" || drag.mode === "se") {
        nh = drag.origH + dy;
      }
      if (nw < MIN_SIZE) {
        if (drag.mode === "nw" || drag.mode === "sw") {
          nx = drag.origX + drag.origW - MIN_SIZE;
        }
        nw = MIN_SIZE;
      }
      if (nh < MIN_SIZE) {
        if (drag.mode === "nw" || drag.mode === "ne") {
          ny = drag.origY + drag.origH - MIN_SIZE;
        }
        nh = MIN_SIZE;
      }
      drag.lastX = nx;
      drag.lastY = ny;
      drag.lastW = nw;
      drag.lastH = nh;
      const stage = stageRef.current;
      if (drag.el) {
        drag.el.style.left = `${nx}px`;
        drag.el.style.top = `${ny}px`;
        drag.el.style.width = `${nw}px`;
        drag.el.style.height = `${nh}px`;
      }
      if (selectionFrameRef.current) {
        selectionFrameRef.current.style.left = `${stage.artLeft + nx * stage.scale}px`;
        selectionFrameRef.current.style.top = `${stage.artTop + ny * stage.scale}px`;
        selectionFrameRef.current.style.width = `${nw * stage.scale}px`;
        selectionFrameRef.current.style.height = `${nh * stage.scale}px`;
      }
    };
    const onUp = () => {
      if (panRef.current) {
        const moved = panRef.current.moved;
        panRef.current = null;
        setPanning(false);
        if (!moved) select(null);
        return;
      }
      const drag = dragRef.current;
      if (drag) {
        dragRef.current = null;
        if (drag.moved) {
          if (drag.mode === "move") {
            const stage = stageRef.current;
            if (drag.el) {
              drag.el.style.left = `${drag.lastX}px`;
              drag.el.style.top = `${drag.lastY}px`;
              drag.el.style.translate = "";
            }
            if (selectionFrameRef.current) {
              selectionFrameRef.current.style.left = `${stage.artLeft + drag.lastX * stage.scale}px`;
              selectionFrameRef.current.style.top = `${stage.artTop + drag.lastY * stage.scale}px`;
              selectionFrameRef.current.style.translate = "";
            }
            updateNode(drag.id, { x: drag.lastX, y: drag.lastY });
          } else {
            updateNode(drag.id, {
              x: drag.lastX,
              y: drag.lastY,
              width: drag.lastW,
              height: drag.lastH,
            });
          }
        }
        if (toolbarWrapRef.current) toolbarWrapRef.current.style.display = "";
        setGuides([]);
        useEditor.getState().clearOpKey();
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [scale, updateNode, select]);

  // Wheel zooms, anchored at the cursor. Shift+wheel pans horizontally.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const current = zoom === "fit" ? fitScale : zoom;
      const factor = Math.exp(-e.deltaY * 0.00125);
      const nextScale = clamp(current * factor, MIN_ZOOM, MAX_ZOOM);
      if (nextScale === current) return;

      const rect = el.getBoundingClientRect();
      const cursorStageX = el.scrollLeft + (e.clientX - rect.left);
      const cursorStageY = el.scrollTop + (e.clientY - rect.top);
      const { artLeft: curArtLeft, artTop: curArtTop } = stageRef.current;
      const artX = (cursorStageX - curArtLeft) / current;
      const artY = (cursorStageY - curArtTop) / current;

      const newScaledW = artboard.width * nextScale;
      const newScaledH = artboard.height * nextScale;
      const newStageW = Math.max(rect.width, newScaledW + STAGE_PADDING * 2);
      const newStageH = Math.max(rect.height, newScaledH + STAGE_PADDING * 2);
      const newArtLeft = (newStageW - newScaledW) / 2;
      const newArtTop = (newStageH - newScaledH) / 2;
      const newCursorStageX = newArtLeft + artX * nextScale;
      const newCursorStageY = newArtTop + artY * nextScale;

      pendingScrollRef.current = {
        left: newCursorStageX - (e.clientX - rect.left),
        top: newCursorStageY - (e.clientY - rect.top),
      };
      setZoom(nextScale);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom, fitScale, setZoom, artboard.width, artboard.height]);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    const pending = pendingScrollRef.current;
    if (!el || !pending) return;
    pendingScrollRef.current = null;
    el.scrollLeft = pending.left;
    el.scrollTop = pending.top;
  }, [scale]);

  const beginDrag = (
    mode: DragMode,
    id: string,
    e: ReactPointerEvent<HTMLElement>,
  ) => {
    const node = useEditor.getState().nodes.find((n) => n.id === id);
    if (!node || node.locked) return;
    e.stopPropagation();
    const el = wrapperRef.current?.querySelector(
      `[data-node-id="${id}"]`,
    ) as HTMLElement | null;
    dragRef.current = {
      mode,
      id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: node.x,
      origY: node.y,
      origW: node.width,
      origH: node.height,
      lastX: node.x,
      lastY: node.y,
      lastW: node.width,
      lastH: node.height,
      moved: false,
      el,
    };
    if (toolbarWrapRef.current) {
      toolbarWrapRef.current.style.display = "none";
    }
  };

  const onBackgroundPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-node-id]")) return;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: wrapper.scrollLeft,
      scrollTop: wrapper.scrollTop,
      moved: false,
    };
  };

  const selected = nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-col bg-zinc-100">
      <div
        ref={wrapperRef}
        className="relative min-h-0 min-w-0 flex-1 select-none overflow-auto bg-zinc-100"
      >
        <div
          style={{
            position: "relative",
            width: stageW,
            height: stageH,
            cursor: panning ? "grabbing" : "grab",
          }}
          onPointerDown={onBackgroundPointerDown}
        >
          <div
            style={{
              position: "absolute",
              left: artLeft,
              top: artTop,
              width: scaledW,
              height: scaledH,
              background: artboardBg,
              boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            }}
            onPointerDown={onBackgroundPointerDown}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: artboard.width,
                height: artboard.height,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
              onPointerDown={onBackgroundPointerDown}
            >
              {nodes.map((node) => (
                <NodeFrame
                  key={node.id}
                  node={node}
                  selected={node.id === selectedId}
                  hovered={hoverId === node.id}
                  scale={scale}
                  draft={draft}
                  onPointerEnter={() => {
                    if (dragRef.current) return;
                    setHoverId(node.id);
                  }}
                  onPointerLeave={() => {
                    if (dragRef.current) return;
                    setHoverId((cur) => (cur === node.id ? null : cur));
                  }}
                  onPointerDown={(e) => {
                    select(node.id);
                    beginDrag("move", node.id, e);
                  }}
                />
              ))}
            </div>
          </div>

          {selected ? (
            <SelectionFrame
              frameRef={selectionFrameRef}
              node={selected}
              artLeft={artLeft}
              artTop={artTop}
              scale={scale}
              onResizeStart={(corner, e) => beginDrag(corner, selected.id, e)}
            />
          ) : null}

          {guides.length > 0 ? (
            <SnapGuides
              guides={guides}
              artLeft={artLeft}
              artTop={artTop}
              scaledW={scaledW}
              scaledH={scaledH}
              scale={scale}
            />
          ) : null}

          {selected ? (
            <div ref={toolbarWrapRef}>
              <FloatingToolbar
                node={selected}
                left={artLeft + selected.x * scale + (selected.width * scale) / 2}
                top={artTop + selected.y * scale}
              />
            </div>
          ) : null}
        </div>
      </div>

      <ZoomBar scale={scale} fitScale={fitScale} />
    </div>
  );
}

function NodeFrame({
  node,
  selected,
  hovered,
  scale,
  draft,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
}: {
  node: EditorNode;
  selected: boolean;
  hovered: boolean;
  scale: number;
  draft: Record<string, unknown>;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}) {
  if (!node.visible) return null;
  const showHover = !selected && hovered;
  const style: CSSProperties = {
    position: "absolute",
    left: node.x,
    top: node.y,
    width: node.width,
    height: node.height,
    opacity: resolveValue(node.opacity, draft) ?? 1,
    transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
    transformOrigin: "center center",
    cursor: node.locked ? "default" : "move",
    outline: showHover ? `${1 / scale}px solid rgb(165 180 252)` : undefined,
    outlineOffset: showHover ? `-${1 / scale}px` : undefined,
  };
  return (
    <div
      style={style}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      data-node-id={node.id}
    >
      <NodeContent node={node} draft={draft} />
    </div>
  );
}

function SelectionFrame({
  frameRef,
  node,
  artLeft,
  artTop,
  scale,
  onResizeStart,
}: {
  frameRef?: React.Ref<HTMLDivElement>;
  node: EditorNode;
  artLeft: number;
  artTop: number;
  scale: number;
  onResizeStart: (
    corner: "nw" | "ne" | "sw" | "se",
    e: ReactPointerEvent<HTMLElement>,
  ) => void;
}) {
  const left = artLeft + node.x * scale;
  const top = artTop + node.y * scale;
  const width = node.width * scale;
  const height = node.height * scale;
  const frame: CSSProperties = {
    position: "absolute",
    left,
    top,
    width,
    height,
    pointerEvents: "none",
    transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
    transformOrigin: "center center",
    outline: "2px solid rgb(99 102 241)",
    outlineOffset: "-1px",
  };
  return (
    <div ref={frameRef} style={frame}>
      <Handle
        position="nw"
        cursor="nwse-resize"
        onPointerDown={(e) => onResizeStart("nw", e)}
      />
      <Handle
        position="ne"
        cursor="nesw-resize"
        onPointerDown={(e) => onResizeStart("ne", e)}
      />
      <Handle
        position="sw"
        cursor="nesw-resize"
        onPointerDown={(e) => onResizeStart("sw", e)}
      />
      <Handle
        position="se"
        cursor="nwse-resize"
        onPointerDown={(e) => onResizeStart("se", e)}
      />
    </div>
  );
}

function Handle({
  position,
  cursor,
  onPointerDown,
}: {
  position: "nw" | "ne" | "sw" | "se";
  cursor: string;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const offsets: Record<"nw" | "ne" | "sw" | "se", CSSProperties> = {
    nw: { left: -5, top: -5 },
    ne: { right: -5, top: -5 },
    sw: { left: -5, bottom: -5 },
    se: { right: -5, bottom: -5 },
  };
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: "absolute",
        width: 10,
        height: 10,
        background: "white",
        border: "1.5px solid rgb(99 102 241)",
        borderRadius: 9999,
        cursor,
        pointerEvents: "auto",
        ...offsets[position],
      }}
    />
  );
}

function SnapGuides({
  guides,
  artLeft,
  artTop,
  scaledW,
  scaledH,
  scale,
}: {
  guides: Guide[];
  artLeft: number;
  artTop: number;
  scaledW: number;
  scaledH: number;
  scale: number;
}) {
  return (
    <>
      {guides.map((g, i) =>
        g.axis === "x" ? (
          <div
            key={i}
            style={{
              position: "absolute",
              left: artLeft + g.position * scale,
              top: artTop,
              width: 1,
              height: scaledH,
              background: "rgb(244 63 94)",
              pointerEvents: "none",
            }}
          />
        ) : (
          <div
            key={i}
            style={{
              position: "absolute",
              top: artTop + g.position * scale,
              left: artLeft,
              height: 1,
              width: scaledW,
              background: "rgb(244 63 94)",
              pointerEvents: "none",
            }}
          />
        ),
      )}
    </>
  );
}

