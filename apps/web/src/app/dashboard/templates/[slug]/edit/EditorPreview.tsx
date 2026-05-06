"use client";

import { useEffect, useState } from "react";

import type { Node, ParamsSchema } from "@waku/ir";

import { BindParamModal, type BindRequest } from "@/components/editor/BindParamModal";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { Inspector } from "@/components/editor/Inspector";
import { ParamsPanel } from "@/components/editor/ParamsPanel";
import { EditorStoreProvider, useEditorStore } from "@/components/editor/StoreProvider";
import { Toolbar } from "@/components/editor/Toolbar";

const RENDER_BASE =
  process.env.NEXT_PUBLIC_RENDER_BASE_URL ?? "http://localhost:3001";

type Props = {
  ir: Node;
  paramsSchema: ParamsSchema;
  handle: string;
  slug: string;
  version: number;
  templateId: string;
  versionId: string;
  isPublished: boolean;
  draftValues: Record<string, unknown>;
};

export default function EditorPreview({
  ir,
  paramsSchema,
  handle,
  slug,
  version,
  templateId,
  versionId,
  isPublished,
  draftValues,
}: Props) {
  return (
    <EditorStoreProvider initial={{ ir, paramsSchema }}>
      <EditorPreviewInner
        handle={handle}
        slug={slug}
        version={version}
        templateId={templateId}
        versionId={versionId}
        isPublished={isPublished}
        draftValues={draftValues}
      />
    </EditorStoreProvider>
  );
}

function EditorPreviewInner({
  handle,
  slug,
  version,
  templateId,
  versionId,
  isPublished,
  draftValues,
}: {
  handle: string;
  slug: string;
  version: number;
  templateId: string;
  versionId: string;
  isPublished: boolean;
  draftValues: Record<string, unknown>;
}) {
  const setDraftValues = useEditorStore((s) => s.setDraftValues);
  const selection = useEditorStore((s) => s.selection);
  const dirty = useEditorStore((s) => s.dirty);
  const liveDraftValues = useEditorStore((s) => s.draftValues);
  const [bindRequest, setBindRequest] = useState<BindRequest | null>(null);

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
    <div className="flex flex-col gap-3">
      <Toolbar
        templateId={templateId}
        versionId={versionId}
        isPublished={isPublished}
        initialDirty={dirty}
      />
      <div className="flex items-center justify-between text-xs text-[#9ca3af]">
        <span>
          {selection.length === 0
            ? "no selection"
            : selection.length === 1
              ? `selected ${selection[0]}`
              : `${selection.length} selected`}
        </span>
        <span>{dirty ? "● unsaved changes" : "no changes"}</span>
      </div>

      <div className="flex flex-row gap-4">
        <ParamsPanel />
        <div className="flex-1 grid grid-cols-1 gap-4 lg:grid-cols-2 min-w-0">
          <Pane label="Editor preview (IRRenderer)">
            <EditorCanvas />
          </Pane>
          <Pane label="Render service output">
            <div className="overflow-hidden rounded-xl border border-[#1f2937] bg-[#0b0f1a]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={renderUrl}
                src={renderUrl}
                alt="rendered template"
                style={{ width: "100%", display: "block" }}
              />
            </div>
          </Pane>
        </div>
        <Inspector onOpenBindModal={setBindRequest} />
      </div>

      <BindParamModal request={bindRequest} onClose={() => setBindRequest(null)} />
    </div>
  );
}

function Pane({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="text-xs font-medium uppercase tracking-wide text-[#9ca3af]">
        {label}
      </div>
      {children}
    </section>
  );
}
