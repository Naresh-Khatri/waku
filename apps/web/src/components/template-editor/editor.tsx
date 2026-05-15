"use client";

import { useEffect, type ReactNode } from "react";
import { Canvas } from "./canvas";
import { ContextualBar } from "./contextual-bar";
import { EditorConfigProvider } from "./editor-config";
import { LeftRail } from "./left-rail";
import { useEditor } from "./store";
import { TopBar } from "./top-bar";
import { useLazyFonts } from "./use-lazy-font";

export function Editor({
  enableParams = false,
  liveUrl,
  topBar,
}: {
  enableParams?: boolean;
  liveUrl?: string | null;
  topBar?: ReactNode;
}) {
  const selectedId = useEditor((s) => s.selectedId);
  const editingId = useEditor((s) => s.editingId);
  const select = useEditor((s) => s.select);
  const setEditingId = useEditor((s) => s.setEditingId);
  // Lazily fetch every font actually used by a text node in the doc. The font
  // picker handles its own preview loading (see FontFamilySelect).
  const usedFontsKey = useEditor((s) => {
    const set = new Set<string>();
    set.add("Inter");
    for (const n of s.nodes) if (n.type === "text") set.add(n.fontFamily);
    return [...set].sort().join("|");
  });
  useLazyFonts(usedFontsKey.split("|"));
  const removeNode = useEditor((s) => s.removeNode);
  const duplicate = useEditor((s) => s.duplicate);
  const copyNode = useEditor((s) => s.copyNode);
  const paste = useEditor((s) => s.paste);
  const setZoom = useEditor((s) => s.setZoom);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && !inField) {
        const key = e.key.toLowerCase();
        if (key === "z" && !e.shiftKey) {
          e.preventDefault();
          undo();
          return;
        }
        if ((key === "z" && e.shiftKey) || key === "y") {
          e.preventDefault();
          redo();
          return;
        }
        if (e.key === "0") {
          e.preventDefault();
          setZoom("fit");
          return;
        }
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          const z = useEditor.getState().zoom;
          const cur = typeof z === "number" ? z : 1;
          setZoom(Math.min(8, cur * 1.25));
          return;
        }
        if (e.key === "-") {
          e.preventDefault();
          const z = useEditor.getState().zoom;
          const cur = typeof z === "number" ? z : 1;
          setZoom(Math.max(0.05, cur * 0.8));
          return;
        }
      }

      if (inField) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        paste();
        return;
      }
      if (!selectedId) return;
      if (e.key === "Enter") {
        const state = useEditor.getState();
        const node = state.nodes.find((n) => n.id === state.selectedId);
        if (node?.type === "text") {
          e.preventDefault();
          setEditingId(node.id);
          return;
        }
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeNode(selectedId);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        copyNode(selectedId);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "x") {
        e.preventDefault();
        copyNode(selectedId);
        removeNode(selectedId);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicate(selectedId);
      } else if (e.key === "Escape") {
        select(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    selectedId,
    editingId,
    removeNode,
    duplicate,
    copyNode,
    paste,
    select,
    setEditingId,
    setZoom,
    undo,
    redo,
  ]);

  return (
    <EditorConfigProvider enableParams={enableParams} liveUrl={liveUrl ?? null}>
      <div className="flex h-full w-full flex-col bg-zinc-100">
        {topBar ?? <TopBar />}
        <div
          className="grid min-h-0 flex-1"
          style={{ gridTemplateColumns: "auto minmax(0, 1fr)" }}
        >
          <LeftRail />
          <div className="relative min-h-0 min-w-0">
            <Canvas />
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
              <ContextualBar />
            </div>
          </div>
        </div>
      </div>
    </EditorConfigProvider>
  );
}
