"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { Node } from "@waku/ir";
import { resolve } from "@waku/ir";

import { IRRenderer } from "./IRRenderer";
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
  const select = useEditorStore((s) => s.select);
  const deselect = useEditorStore((s) => s.deselect);
  const deleteNode = useEditorStore((s) => s.deleteNode);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isInputTarget(e.target)) return;
      const meta = e.metaKey || e.ctrlKey;

      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
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
  }, [selection, deleteNode, undo, redo, deselect]);

  const onClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
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

  // Resolve params for preview using draft values; fall back to defaults already
  // baked into the IR via resolve()'s ParamRef-default handling.
  let resolved: Node;
  try {
    resolved = resolve(ir, draftValues);
  } catch {
    resolved = ir;
  }

  return (
    <ScaledCanvas w={w} h={h}>
      <style>{`[data-node-id] { cursor: pointer; }`}</style>
      <div
        ref={containerRef}
        onClick={onClick}
        style={{ width: w, height: h, position: "relative" }}
      >
        <IRRenderer ir={resolved} selectedIds={selection} />
        <SelectionOverlay containerRef={containerRef} irW={w} />
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
