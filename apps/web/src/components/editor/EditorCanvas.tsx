"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { IRRenderer } from "./IRRenderer";
import { resolveForEditor } from "./resolveForEditor";
import { SelectionOverlay } from "./SelectionOverlay";
import { useEditorStore } from "./StoreProvider";

const isInputTarget = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.isContentEditable
  );
};

export function EditorCanvas() {
  const ir = useEditorStore((s) => s.ir);
  const draftValues = useEditorStore((s) => s.draftValues);
  const selection = useEditorStore((s) => s.selection);
  const previewMode = useEditorStore((s) => s.previewMode);
  const select = useEditorStore((s) => s.select);
  const deselect = useEditorStore((s) => s.deselect);
  const deleteNode = useEditorStore((s) => s.deleteNode);
  const duplicateNode = useEditorStore((s) => s.duplicateNode);
  const setPreviewMode = useEditorStore((s) => s.setPreviewMode);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isInputTarget(e.target)) return;
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key === "Enter") {
        e.preventDefault();
        setPreviewMode(!previewMode);
        return;
      }
      if (previewMode) return;

      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (meta && e.key.toLowerCase() === "d") {
        if (selection.length === 0) return;
        e.preventDefault();
        for (const path of selection) duplicateNode(path);
        return;
      }
      if (e.key === "Escape") {
        deselect();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selection.length === 0) return;
        e.preventDefault();
        for (const path of selection) deleteNode(path);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selection, deleteNode, duplicateNode, undo, redo, deselect, previewMode, setPreviewMode]);

  const onClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (previewMode) return;
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(
      "[data-node-id]",
    );
    if (!target) {
      deselect();
      return;
    }
    const id = target.dataset.nodeId;
    if (!id) return;
    select(id, e.shiftKey);
  };

  const w = ir.type === "frame" ? ir.w : 1200;
  const h = ir.type === "frame" ? ir.h : 630;

  const resolved = resolveForEditor(ir, draftValues);

  return (
    <ScaledCanvas w={w} h={h}>
      <style>{`[data-node-id] { cursor: pointer; }`}</style>
      <div
        ref={containerRef}
        onClick={onClick}
        style={{ width: w, height: h, position: "relative" }}
      >
        <IRRenderer ir={resolved} selectedIds={previewMode ? [] : selection} />
        {!previewMode && <SelectionOverlay containerRef={containerRef} irW={w} />}
      </div>
    </ScaledCanvas>
  );
}

function ScaledCanvas({
  w,
  h,
  children,
}: {
  w: number;
  h: number;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#1f2937] bg-[#0b0f1a]">
      <div
        className="origin-top-left"
        style={{
          width: w,
          height: h,
          transform: "scale(var(--canvas-scale, 1))",
          transformOrigin: "top left",
        }}
        ref={(el) => {
          if (!el) return;
          const parent = el.parentElement;
          if (!parent) return;
          const update = () => {
            const scale = Math.min(parent.clientWidth / w, 1);
            el.style.setProperty("--canvas-scale", String(scale));
            parent.style.height = `${h * scale}px`;
          };
          update();
          const ro = new ResizeObserver(update);
          ro.observe(parent);
        }}
      >
        {children}
      </div>
    </div>
  );
}
