"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import type { Node, ParamsSchema } from "@waku/ir";

import { BindParamModal, type BindRequest } from "@/components/editor/BindParamModal";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { InsertBar } from "@/components/editor/InsertBar";
import { Inspector } from "@/components/editor/Inspector";
import { LayersPanel } from "@/components/editor/LayersPanel";
import { ParamsPanel } from "@/components/editor/ParamsPanel";
import { EditorStoreProvider, useEditorStore } from "@/components/editor/StoreProvider";
import { Toolbar } from "@/components/editor/Toolbar";
import { env } from "@/env";

const RENDER_BASE = env.NEXT_PUBLIC_RENDER_BASE_URL;

type Props = {
  ir: Node;
  paramsSchema: ParamsSchema;
  templateName: string;
  templateSlug: string;
  handle: string;
  slug: string;
  version: number;
  templateId: string;
  versionId: string;
  isPublished: boolean;
  draftValues: Record<string, unknown>;
};

export default function EditorPreview(props: Props) {
  return (
    <EditorStoreProvider initial={{ ir: props.ir, paramsSchema: props.paramsSchema }}>
      <EditorShell {...props} />
    </EditorStoreProvider>
  );
}

function EditorShell({
  templateName,
  templateSlug,
  handle,
  slug,
  version,
  templateId,
  versionId,
  isPublished,
  draftValues,
}: Props) {
  const setDraftValues = useEditorStore((s) => s.setDraftValues);
  const dirty = useEditorStore((s) => s.dirty);
  const liveDraftValues = useEditorStore((s) => s.draftValues);
  const [bindRequest, setBindRequest] = useState<BindRequest | null>(null);
  const [leftTab, setLeftTab] = useState<"layers" | "params">("layers");
  const [showRendered, setShowRendered] = useState(false);

  useEffect(() => {
    setDraftValues(draftValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderUrl = (() => {
    const base = `${RENDER_BASE}/r/${handle}/${slug}/${version}`;
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(liveDraftValues)) {
      if (v === undefined || v === null || v === "") continue;
      qs.set(k, String(v));
    }
    const s = qs.toString();
    return s ? `${base}?${s}` : base;
  })();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#030712] text-[#e5e7eb]">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[#1f2937] bg-[#0b0f1a] px-3">
        <Link
          href={`/dashboard/templates/${templateSlug}`}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#9ca3af] hover:bg-[#111827] hover:text-[#e5e7eb]"
          title="Back to template"
        >
          <span aria-hidden>←</span>
          <span className="hidden sm:inline">back</span>
        </Link>
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-sm font-semibold">{templateName}</span>
          <span className="font-mono text-[10px] text-[#6b7280]">
            v{version}
            {isPublished ? " · published" : " · draft"}
          </span>
          {dirty && <span className="text-[10px] text-[#fbbf24]">●</span>}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Toolbar
            templateId={templateId}
            versionId={versionId}
            isPublished={isPublished}
            initialDirty={dirty}
          />
        </div>
      </header>

      {/* Main 3-column body */}
      <div className="flex min-h-0 flex-1">
        {/* Left sidebar */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-[#1f2937] bg-[#0b0f1a]">
          <div className="flex shrink-0 border-b border-[#1f2937]">
            <SidebarTab
              active={leftTab === "layers"}
              onClick={() => setLeftTab("layers")}
            >
              Layers
            </SidebarTab>
            <SidebarTab
              active={leftTab === "params"}
              onClick={() => setLeftTab("params")}
            >
              Params
            </SidebarTab>
          </div>
          <div className="min-h-0 flex-1">
            {leftTab === "layers" ? <LayersPanel /> : <ParamsPanel />}
          </div>
        </aside>

        {/* Canvas area */}
        <main className="relative flex min-w-0 flex-1 flex-col bg-[#030712]">
          <div className="absolute left-3 top-3 z-10">
            <InsertBar />
          </div>
          <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
            <button
              onClick={() => setShowRendered((v) => !v)}
              className={[
                "rounded-md border px-2.5 py-1 text-[11px] transition",
                showRendered
                  ? "border-[#7c5cff66] bg-[#7c5cff22] text-[#c4b5fd]"
                  : "border-[#1f2937] bg-[#0b0f1aE6] text-[#9ca3af] hover:text-[#e5e7eb]",
              ].join(" ")}
              title="Toggle live render-service preview"
            >
              {showRendered ? "rendered" : "show rendered"}
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-12">
            {showRendered ? (
              <div className="overflow-hidden rounded-lg shadow-2xl ring-1 ring-[#1f2937]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={renderUrl}
                  src={renderUrl}
                  alt="rendered template"
                  className="block max-h-[calc(100vh-160px)] max-w-[calc(100vw-720px)]"
                />
              </div>
            ) : (
              <EditorCanvas />
            )}
          </div>
          <UrlBar url={renderUrl} />
        </main>

        {/* Right sidebar */}
        <aside className="flex w-80 shrink-0 flex-col border-l border-[#1f2937] bg-[#0b0f1a]">
          <Inspector onOpenBindModal={setBindRequest} />
        </aside>
      </div>

      <BindParamModal request={bindRequest} onClose={() => setBindRequest(null)} />
    </div>
  );
}

function SidebarTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition",
        active
          ? "border-b-2 border-[#7c5cff] text-[#e5e7eb]"
          : "border-b-2 border-transparent text-[#6b7280] hover:text-[#9ca3af]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function UrlBar({ url }: { url: string }) {
  const selection = useEditorStore((s) => s.selection);
  const ir = useEditorStore((s) => s.ir);
  const w = ir.type === "frame" ? ir.w : 1200;
  const h = ir.type === "frame" ? ir.h : 630;
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      inputRef.current?.select();
      document.execCommand("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-t border-[#1f2937] bg-[#0b0f1a] px-3 text-[10px] text-[#6b7280]">
      <span className="shrink-0 font-mono">
        {selection.length === 0
          ? "no selection"
          : selection.length === 1
            ? selection[0]
            : `${selection.length} selected`}
      </span>
      <span className="text-[#1f2937]">|</span>
      <span className="shrink-0 font-mono">
        {w}×{h}
      </span>
      <span className="text-[#1f2937]">|</span>
      <span className="shrink-0 text-[10px] uppercase tracking-wide text-[#6b7280]">
        URL
      </span>
      <input
        ref={inputRef}
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="flex-1 min-w-0 rounded border border-[#1f2937] bg-[#030712] px-2 py-1 font-mono text-[11px] text-[#d1d5db] outline-none focus:border-[#7c5cff66]"
      />
      <button
        onClick={copy}
        className={[
          "shrink-0 rounded border px-2.5 py-1 text-[11px] transition",
          copied
            ? "border-[#22c55e66] bg-[#22c55e22] text-[#86efac]"
            : "border-[#1f2937] bg-[#0b0f1a] text-[#9ca3af] hover:text-[#e5e7eb]",
        ].join(" ")}
      >
        {copied ? "copied" : "copy"}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 rounded border border-[#1f2937] bg-[#0b0f1a] px-2.5 py-1 text-[11px] text-[#9ca3af] transition hover:text-[#e5e7eb]"
      >
        open ↗
      </a>
    </div>
  );
}
