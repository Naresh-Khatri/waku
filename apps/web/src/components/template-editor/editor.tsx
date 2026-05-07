"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BindParamModal, type BindRequest } from "./bind-param-modal";
import { Canvas } from "./canvas";
import { EditorConfigProvider } from "./editor-config";
import { Inspector } from "./inspector";
import { LayersPanel } from "./layers-panel";
import { useEditor } from "./store";
import { TopBar } from "./top-bar";

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
  const select = useEditor((s) => s.select);
  const removeNode = useEditor((s) => s.removeNode);
  const duplicate = useEditor((s) => s.duplicate);
  const setZoom = useEditor((s) => s.setZoom);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);

  const [bindRequest, setBindRequest] = useState<BindRequest | null>(null);
  const openBindModal = useCallback((req: BindRequest) => setBindRequest(req), []);
  const closeBindModal = useCallback(() => setBindRequest(null), []);

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
      if (!selectedId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
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
  }, [selectedId, removeNode, duplicate, select, setZoom, undo, redo]);

  return (
    <EditorConfigProvider
      enableParams={enableParams}
      openBindModal={enableParams ? openBindModal : null}
      liveUrl={liveUrl ?? null}
    >
      <div
        className="grid h-full w-full bg-zinc-100"
        style={{ gridTemplateRows: "48px minmax(0, 1fr)" }}
      >
        {topBar ?? <TopBar />}
        <div
          className="grid min-h-0 p-2"
          style={{ gridTemplateColumns: "240px minmax(0, 1fr) 280px" }}
        >
          <LayersPanel />
          <Canvas />
          <Inspector />
        </div>
        {enableParams ? (
          <BindParamModal request={bindRequest} onClose={closeBindModal} />
        ) : null}
      </div>
    </EditorConfigProvider>
  );
}
