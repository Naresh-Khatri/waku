"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Editor } from "@/components/template-editor/editor";
import { PreviewPanel } from "@/components/template-editor/preview-panel";
import { useEditor } from "@/components/template-editor/store";
import type { TemplateDocument } from "@/components/template-editor/types";
import { paramsFromSearch } from "@/components/template-editor/url-params";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { env } from "@/env";
import { api } from "@/trpc/react";

const RENDER_BASE = env.NEXT_PUBLIC_RENDER_BASE_URL;
const AUTOSAVE_DEBOUNCE_MS = 800;

type Props = {
  document: TemplateDocument;
  templateId: string;
  templateName: string;
  templateSlug: string;
  handle: string;
  version: number;
  versionId: string;
};

export default function EditorPreview(props: Props) {
  const loadDocument = useEditor((s) => s.loadDocument);
  const setDraftValues = useEditor((s) => s.setDraftValues);
  const searchParams = useSearchParams();

  useEffect(() => {
    loadDocument(props.document);
    setDraftValues(paramsFromSearch(searchParams, props.document.paramsSchema));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.versionId]);

  // Autosave publishes to the canonical versioned URL, so the editor preview
  // can read straight from it. Only stale CDN/browser caches stand between an
  // edit and the rendered output, and we keep those windows short.
  const liveUrl = `${RENDER_BASE}/r/${props.handle}/${props.templateSlug}/${props.version}`;

  return (
    <div className="fixed inset-0 z-50">
      <Editor
        enableParams
        liveUrl={liveUrl}
        topBar={<EditorTopBar {...props} liveUrl={liveUrl} />}
      />
    </div>
  );
}

function EditorTopBar({
  templateId,
  templateName,
  templateSlug,
  handle,
  version,
  versionId,
  liveUrl,
}: Props & { liveUrl: string }) {
  const router = useRouter();
  const dirty = useEditor((s) => s.dirty);
  const getDocument = useEditor((s) => s.getDocument);
  const markClean = useEditor((s) => s.markClean);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const updateDraft = api.template.updateDraft.useMutation({
    onSuccess: () => {
      setSavedAt(Date.now());
      setSaveError(null);
      markClean();
    },
    onError: (err) => setSaveError(err.message),
  });

  const del = api.template.delete.useMutation({
    onSuccess: () => router.push("/dashboard"),
  });

  const saveTimerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  const save = () => {
    if (inFlightRef.current || updateDraft.isPending) return;
    inFlightRef.current = true;
    updateDraft.mutate(
      { versionId, documentJson: getDocument() },
      { onSettled: () => (inFlightRef.current = false) },
    );
  };

  useEffect(() => {
    if (!dirty) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(save, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = (() => {
    if (saveError) return { tone: "error" as const, label: saveError };
    if (updateDraft.isPending)
      return { tone: "info" as const, label: "saving…" };
    if (dirty) return { tone: "warn" as const, label: "unsaved" };
    if (savedAt) return { tone: "ok" as const, label: "saved" };
    return null;
  })();

  return (
    <header className="flex h-12 items-center gap-3 border-b border-zinc-200 bg-white px-3">
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
        title="Back to dashboard"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Back</span>
      </Link>
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-semibold text-zinc-800">
          {templateName}
        </span>
        <span className="font-mono text-[10px] text-zinc-400">v{version}</span>
      </div>

      {status ? (
        <span
          className={`ml-2 flex items-center gap-1.5 text-[11px] ${
            status.tone === "error"
              ? "text-rose-600"
              : status.tone === "warn"
                ? "text-amber-600"
                : status.tone === "info"
                  ? "text-zinc-500"
                  : "text-emerald-600"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status.tone === "error"
                ? "bg-rose-500"
                : status.tone === "warn"
                  ? "bg-amber-500"
                  : status.tone === "info"
                    ? "bg-zinc-400"
                    : "bg-emerald-500"
            }`}
          />
          {status.label}
        </span>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        <PreviewPanel
          liveUrl={liveUrl}
          templateId={templateId}
          handle={handle}
          templateSlug={templateSlug}
          renderBase={RENDER_BASE}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                if (
                  confirm(`Delete "${templateName}"? This cannot be undone.`)
                ) {
                  del.mutate({ templateId });
                }
              }}
              disabled={del.isPending}
              aria-label="Delete template"
              className="text-zinc-500 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete template</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
