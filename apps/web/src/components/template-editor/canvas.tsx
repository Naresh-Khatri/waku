"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Link2 } from "lucide-react";
import { useEditor } from "./store";
import type { Guide, Zoom } from "./store";
import { snapMove, snapResize } from "./snap";
import type { EditorNode } from "./types";
import {
  isParamRef,
  paintToCss,
  paramsWithDefaults,
  resolveValue,
} from "./types";
import { NodeContent } from "./node-view";
import { nodeBoundParams } from "./node-bindings";
import { FloatingToolbar } from "./floating-toolbar";
import { useIsMobile } from "./use-is-mobile";
import { ZoomBar } from "./zoom-bar";

type ResizeMode = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";
type DragMode = "move" | ResizeMode;

const RESIZE_EDGES: Record<
  ResizeMode,
  { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean }
> = {
  nw: { left: true, top: true },
  ne: { right: true, top: true },
  sw: { left: true, bottom: true },
  se: { right: true, bottom: true },
  n: { top: true },
  s: { bottom: true },
  e: { right: true },
  w: { left: true },
};

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
  const editingId = useEditor((s) => s.editingId);
  const zoom = useEditor((s) => s.zoom);
  const select = useEditor((s) => s.select);
  const updateNode = useEditor((s) => s.updateNode);
  const setEditingId = useEditor((s) => s.setEditingId);
  const setDraftValue = useEditor((s) => s.setDraftValue);
  const setZoom = useEditor((s) => s.setZoom);
  const draftValues = useEditor((s) => s.draftValues);
  const paramsSchema = useEditor((s) => s.paramsSchema);
  const draft = paramsWithDefaults(draftValues, paramsSchema);
  const artboardBg = paintToCss(artboard.background, draft);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectionFrameRef = useRef<HTMLDivElement>(null);
  const sizePillRef = useRef<HTMLDivElement>(null);
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
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(
    new Map(),
  );
  const lastPinchDistRef = useRef<number | null>(null);
  const isMobile = useIsMobile();

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
      if (activePointersRef.current.has(e.pointerId)) {
        activePointersRef.current.set(e.pointerId, {
          x: e.clientX,
          y: e.clientY,
        });
      }

      // Two fingers down with no active node drag → pinch-to-zoom, anchored at
      // the gesture midpoint (reuses the wheel-zoom scroll-anchor math).
      if (activePointersRef.current.size === 2 && !dragRef.current) {
        const pts = [...activePointersRef.current.values()];
        const p1 = pts[0]!;
        const p2 = pts[1]!;
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const last = lastPinchDistRef.current;
        if (last !== null && last > 0) {
          const z = useEditor.getState().zoom;
          const current = z === "fit" ? fitScale : z;
          const nextScale = clamp(
            current * (dist / last),
            MIN_ZOOM,
            MAX_ZOOM,
          );
          const el = wrapperRef.current;
          if (nextScale !== current && el) {
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            const rect = el.getBoundingClientRect();
            const cursorStageX = el.scrollLeft + (midX - rect.left);
            const cursorStageY = el.scrollTop + (midY - rect.top);
            const { artLeft: curArtLeft, artTop: curArtTop } =
              stageRef.current;
            const artX = (cursorStageX - curArtLeft) / current;
            const artY = (cursorStageY - curArtTop) / current;
            const newScaledW = artboard.width * nextScale;
            const newScaledH = artboard.height * nextScale;
            const newStageW = Math.max(
              rect.width,
              newScaledW + STAGE_PADDING * 2,
            );
            const newStageH = Math.max(
              rect.height,
              newScaledH + STAGE_PADDING * 2,
            );
            const newArtLeft = (newStageW - newScaledW) / 2;
            const newArtTop = (newStageH - newScaledH) / 2;
            pendingScrollRef.current = {
              left: newArtLeft + artX * nextScale - (midX - rect.left),
              top: newArtTop + artY * nextScale - (midY - rect.top),
            };
            setZoom(nextScale);
          }
        }
        lastPinchDistRef.current = dist;
        return;
      }

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

      const edges = RESIZE_EDGES[drag.mode as ResizeMode];
      let nx = drag.origX;
      let ny = drag.origY;
      let nw = drag.origW;
      let nh = drag.origH;
      if (edges.left) {
        nx = drag.origX + dx;
        nw = drag.origW - dx;
      }
      if (edges.right) {
        nw = drag.origW + dx;
      }
      if (edges.top) {
        ny = drag.origY + dy;
        nh = drag.origH - dy;
      }
      if (edges.bottom) {
        nh = drag.origH + dy;
      }

      const others = state.nodes.filter((n) => n.id !== drag.id);
      const snapped = snapResize(
        { x: nx, y: ny, width: nw, height: nh },
        edges,
        others,
        state.artboard,
      );
      nx = snapped.x;
      ny = snapped.y;
      nw = snapped.width;
      nh = snapped.height;
      setGuides((prev) =>
        sameGuides(prev, snapped.guides) ? prev : snapped.guides,
      );

      if (nw < MIN_SIZE) {
        if (edges.left) {
          nx = drag.origX + drag.origW - MIN_SIZE;
        }
        nw = MIN_SIZE;
      }
      if (nh < MIN_SIZE) {
        if (edges.top) {
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
      if (sizePillRef.current) {
        sizePillRef.current.textContent = `${Math.round(nw)} × ${Math.round(nh)}`;
        sizePillRef.current.style.display = "block";
      }
    };
    const onUp = (e: PointerEvent) => {
      activePointersRef.current.delete(e.pointerId);
      if (activePointersRef.current.size < 2) {
        lastPinchDistRef.current = null;
      }
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
        if (sizePillRef.current) sizePillRef.current.style.display = "none";
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
  }, [
    scale,
    updateNode,
    select,
    fitScale,
    setZoom,
    artboard.width,
    artboard.height,
  ]);

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
    const state = useEditor.getState();
    const node = state.nodes.find((n) => n.id === id);
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
    if (editingId) {
      // Flush the editor's pending commit (its blur handler) while it is
      // still mounted, before we tear it down.
      (document.activeElement as HTMLElement | null)?.blur();
      setEditingId(null);
    }
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    activePointersRef.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
    });
    // A second finger starts a pinch, not a pan — leave any in-progress pan
    // as-is and let the pinch handler take over.
    if (activePointersRef.current.size > 1) {
      panRef.current = null;
      return;
    }
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: wrapper.scrollLeft,
      scrollTop: wrapper.scrollTop,
      moved: false,
    };
  };

  const selected = nodes.find((n) => n.id === selectedId) ?? null;
  const measured = wrapperSize.w > 0 && wrapperSize.h > 0;

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-col bg-zinc-100">
      <div
        ref={wrapperRef}
        className="relative min-h-0 min-w-0 flex-1 select-none overflow-auto bg-zinc-100"
        style={{ touchAction: "none" }}
      >
        <div
          style={{
            position: "relative",
            width: stageW,
            height: stageH,
            cursor: panning ? "grabbing" : "grab",
            visibility: measured ? "visible" : "hidden",
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
              {nodes.map((node) => {
                const isEditing = editingId === node.id;
                const isSelected = node.id === selectedId;
                const canEdit = node.type === "text";
                return (
                  <NodeFrame
                    key={node.id}
                    node={node}
                    selected={isSelected}
                    hovered={hoverId === node.id}
                    editing={isEditing}
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
                      if (isEditing) return;
                      select(node.id);
                      beginDrag("move", node.id, e);
                    }}
                    onRequestEdit={
                      canEdit
                        ? () => {
                            select(node.id);
                            setEditingId(node.id);
                          }
                        : undefined
                    }
                    onCommitText={(text) => {
                      if (node.type === "text" && isParamRef(node.text)) {
                        setDraftValue(node.text.$param, text);
                      } else {
                        updateNode(node.id, { text });
                      }
                    }}
                    onExitEditing={() => {
                      if (useEditor.getState().editingId === node.id) {
                        setEditingId(null);
                      }
                    }}
                  />
                );
              })}
            </div>
          </div>

          {selected ? (
            <SelectionFrame
              frameRef={selectionFrameRef}
              sizePillRef={sizePillRef}
              node={selected}
              artLeft={artLeft}
              artTop={artTop}
              scale={scale}
              hideHandles={
                editingId === selected.id && selected.type === "text"
              }
              onResizeStart={(mode, e) => beginDrag(mode, selected.id, e)}
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

          {selected && editingId !== selected.id && !isMobile ? (
            <div ref={toolbarWrapRef}>
              <FloatingToolbar
                node={selected}
                left={
                  artLeft + selected.x * scale + (selected.width * scale) / 2
                }
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
  editing,
  scale,
  draft,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onRequestEdit,
  onCommitText,
  onExitEditing,
}: {
  node: EditorNode;
  selected: boolean;
  hovered: boolean;
  editing: boolean;
  scale: number;
  draft: Record<string, unknown>;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onRequestEdit?: (caret?: { x: number; y: number }) => void;
  onCommitText: (text: string) => void;
  onExitEditing: () => void;
}) {
  const wasSelectedBeforePressRef = useRef(false);
  const caretPointRef = useRef<{ x: number; y: number } | null>(null);
  if (!node.visible) return null;
  const showHover = !selected && hovered;
  const boundNames = nodeBoundParams(node);
  const showBinding = boundNames.length > 0 && !editing;
  const style: CSSProperties = {
    position: "absolute",
    left: node.x,
    top: node.y,
    width: node.width,
    height: node.height,
    opacity: resolveValue(node.opacity, draft) ?? 1,
    transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
    transformOrigin: "center center",
    cursor: editing ? "text" : node.locked ? "default" : "move",
    touchAction: "none",
    outline: showHover ? `${1 / scale}px solid rgb(165 180 252)` : undefined,
    outlineOffset: showHover ? `-${1 / scale}px` : undefined,
    ...(editing
      ? {
          boxShadow: `0 0 0 ${2 / scale}px rgb(99 102 241)`,
          borderRadius: 2,
        }
      : {}),
    ...(showBinding
      ? {
          boxShadow: `inset 0 0 0 ${1.5 / scale}px rgba(99, 102, 241, 0.55)`,
        }
      : {}),
  };
  return (
    <div
      style={style}
      onPointerDown={(e) => {
        if (editing) {
          e.stopPropagation();
          return;
        }
        wasSelectedBeforePressRef.current = selected;
        onPointerDown(e);
      }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={(e) => {
        if (editing) return;
        if (!onRequestEdit) return;
        if (!wasSelectedBeforePressRef.current) return;
        const caret = { x: e.clientX, y: e.clientY };
        caretPointRef.current = caret;
        onRequestEdit(caret);
      }}
      data-node-id={node.id}
    >
      {showBinding ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transform: `translateY(-100%) scale(${1 / scale})`,
            transformOrigin: "bottom left",
            display: "flex",
            alignItems: "center",
            gap: 3,
            marginBottom: 2,
            padding: "1px 5px",
            background: "rgb(99 102 241)",
            color: "white",
            fontSize: 10,
            lineHeight: "14px",
            fontWeight: 600,
            borderRadius: 3,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
        >
          <Link2 size={10} strokeWidth={2.5} style={{ flexShrink: 0 }} />
          {boundNames.join(" · ")}
        </div>
      ) : null}
      <NodeContent
        node={node}
        draft={draft}
        editing={editing}
        caretPoint={editing ? caretPointRef.current : null}
        onCommitText={onCommitText}
        onExitEditing={onExitEditing}
      />
    </div>
  );
}

function SelectionFrame({
  frameRef,
  sizePillRef,
  node,
  artLeft,
  artTop,
  scale,
  hideHandles = false,
  onResizeStart,
}: {
  frameRef?: React.Ref<HTMLDivElement>;
  sizePillRef?: React.Ref<HTMLDivElement>;
  node: EditorNode;
  artLeft: number;
  artTop: number;
  scale: number;
  hideHandles?: boolean;
  onResizeStart: (
    mode: ResizeMode,
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
    outline: hideHandles
      ? "1.5px solid rgb(99 102 241)"
      : "2px solid rgb(99 102 241)",
    outlineOffset: "-1px",
  };
  return (
    <div ref={frameRef} style={frame}>
      {!hideHandles && (
        <>
          <EdgeHandle
            edge="n"
            cursor="ns-resize"
            onPointerDown={(e) => onResizeStart("n", e)}
          />
          <EdgeHandle
            edge="s"
            cursor="ns-resize"
            onPointerDown={(e) => onResizeStart("s", e)}
          />
          <EdgeHandle
            edge="w"
            cursor="ew-resize"
            onPointerDown={(e) => onResizeStart("w", e)}
          />
          <EdgeHandle
            edge="e"
            cursor="ew-resize"
            onPointerDown={(e) => onResizeStart("e", e)}
          />
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
        </>
      )}
      <div
        ref={sizePillRef}
        style={{
          display: "none",
          position: "absolute",
          left: "50%",
          bottom: -28,
          transform: "translateX(-50%)",
          padding: "2px 8px",
          background: "rgb(99 102 241)",
          color: "white",
          fontSize: 11,
          fontWeight: 600,
          lineHeight: "16px",
          borderRadius: 9999,
          whiteSpace: "nowrap",
          pointerEvents: "none",
          fontVariantNumeric: "tabular-nums",
        }}
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
  // 44×44 transparent hit area centered on the corner (touch target), with a
  // 10×10 visual dot centered inside it. Invisible to mouse users — no desktop
  // regression — while giving fingers a reliable target.
  const offsets: Record<"nw" | "ne" | "sw" | "se", CSSProperties> = {
    nw: { left: -22, top: -22 },
    ne: { right: -22, top: -22 },
    sw: { left: -22, bottom: -22 },
    se: { right: -22, bottom: -22 },
  };
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: "absolute",
        width: 44,
        height: 44,
        cursor,
        pointerEvents: "auto",
        touchAction: "none",
        zIndex: 1,
        ...offsets[position],
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 17,
          top: 17,
          width: 10,
          height: 10,
          background: "white",
          border: "1.5px solid rgb(99 102 241)",
          borderRadius: 9999,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function EdgeHandle({
  edge,
  cursor,
  onPointerDown,
}: {
  edge: "n" | "s" | "e" | "w";
  cursor: string;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  // A hit strip running along the side, inset 22px at each end so it never
  // overlaps a corner's 44×44 hit area. A thin bar is drawn on the edge as a
  // visual affordance.
  const horizontal = edge === "n" || edge === "s";
  const strip: CSSProperties = horizontal
    ? {
        left: 22,
        right: 22,
        height: 16,
        ...(edge === "n" ? { top: -8 } : { bottom: -8 }),
      }
    : {
        top: 22,
        bottom: 22,
        width: 16,
        ...(edge === "w" ? { left: -8 } : { right: -8 }),
      };
  const bar: CSSProperties = horizontal
    ? { left: "50%", top: 7, width: 18, height: 4, marginLeft: -9 }
    : { top: "50%", left: 7, width: 4, height: 18, marginTop: -9 };
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: "absolute",
        cursor,
        pointerEvents: "auto",
        touchAction: "none",
        ...strip,
      }}
    >
      <div
        style={{
          position: "absolute",
          background: "white",
          border: "1.5px solid rgb(99 102 241)",
          borderRadius: 9999,
          pointerEvents: "none",
          ...bar,
        }}
      />
    </div>
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
