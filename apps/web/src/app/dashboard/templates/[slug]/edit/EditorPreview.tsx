"use client";

import { useEffect } from "react";

import type { Node, ParamsSchema } from "@waku/ir";

import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { EditorStoreProvider, useEditorStore } from "@/components/editor/StoreProvider";

const RENDER_BASE =
  process.env.NEXT_PUBLIC_RENDER_BASE_URL ?? "http://localhost:3001";

type Props = {
  ir: Node;
  paramsSchema: ParamsSchema;
  handle: string;
  slug: string;
  version: number;
  draftValues: Record<string, unknown>;
};

export default function EditorPreview({
  ir,
  paramsSchema,
  handle,
  slug,
  version,
  draftValues,
}: Props) {
  return (
    <EditorStoreProvider initial={{ ir, paramsSchema }}>
      <EditorPreviewInner
        handle={handle}
        slug={slug}
        version={version}
        draftValues={draftValues}
      />
    </EditorStoreProvider>
  );
}

function EditorPreviewInner({
  handle,
  slug,
  version,
  draftValues,
}: {
  handle: string;
  slug: string;
  version: number;
  draftValues: Record<string, unknown>;
}) {
  const setDraftValues = useEditorStore((s) => s.setDraftValues);
  const selection = useEditorStore((s) => s.selection);
  const dirty = useEditorStore((s) => s.dirty);

  useEffect(() => {
    setDraftValues(draftValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rendered = `${RENDER_BASE}/r/${handle}/${slug}/${version}`;

  return (
    <div className="flex flex-col gap-3">
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Pane label="Editor preview (IRRenderer)">
          <EditorCanvas />
        </Pane>
        <Pane label="Render service output">
          <div className="overflow-hidden rounded-xl border border-[#1f2937] bg-[#0b0f1a]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={rendered}
              alt="rendered template"
              style={{ width: "100%", display: "block" }}
            />
          </div>
        </Pane>
      </div>
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

