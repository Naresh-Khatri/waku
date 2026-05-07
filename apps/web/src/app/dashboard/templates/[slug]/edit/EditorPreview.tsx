"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Editor } from "@/components/template-editor/editor";
import { useEditor } from "@/components/template-editor/store";
import type { TemplateDocument } from "@/components/template-editor/types";
import { paramsFromSearch } from "@/components/template-editor/url-params";
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
  isPublished: boolean;
};

export default function EditorPreview(props: Props) {
  const loadDocument = useEditor((s) => s.loadDocument);
  const setDraftValues = useEditor((s) => s.setDraftValues);
  const searchParams = useSearchParams();

  useEffect(() => {
    loadDocument(props.document);
    setDraftValues(
      paramsFromSearch(searchParams, props.document.paramsSchema),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.versionId]);

  const liveUrl = `${RENDER_BASE}/r/${props.handle}/${props.templateSlug}/${props.version}`;

  return (
    <div className="fixed inset-0 z-50">
      <Editor
        enableParams
        liveUrl={liveUrl}
        topBar={<EditorTopBar {...props} />}
      />
    </div>
  );
}

function EditorTopBar({
  templateId,
  templateName,
  templateSlug,
  version,
  versionId,
  isPublished,
}: Props) {
  const router = useRouter();
  const dirty = useEditor((s) => s.dirty);
  const getDocument = useEditor((s) => s.getDocument);
  const markClean = useEditor((s) => s.markClean);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [publishedAt, setPublishedAt] = useState<boolean>(isPublished);

  const updateDraft = api.template.updateDraft.useMutation({
    onSuccess: () => {
      setSavedAt(Date.now());
      setSaveError(null);
      markClean();
    },
    onError: (err) => setSaveError(err.message),
  });
  const publish = api.template.publish.useMutation({
    onSuccess: () => setPublishedAt(true),
    onError: (err) => setSaveError(err.message),
  });
  const fork = api.template.createVersion.useMutation({
    onSuccess: () => {
      setSaveError(null);
      router.refresh();
    },
    onError: (err) => setSaveError(err.message),
  });

  const saveTimerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  const save = () => {
    if (inFlightRef.current || updateDraft.isPending) return;
    if (publishedAt) {
      setSaveError("cannot edit a published version — fork to a new draft");
      return;
    }
    inFlightRef.current = true;
    updateDraft.mutate(
      { versionId, documentJson: getDocument() },
      { onSettled: () => (inFlightRef.current = false) },
    );
  };

  // Auto-save: debounce while dirty.
  useEffect(() => {
    if (!dirty) return;
    if (publishedAt) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(save, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, publishedAt]);

  // Cmd/Ctrl+S manual save.
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
    if (updateDraft.isPending) return { tone: "info" as const, label: "saving…" };
    if (dirty) return { tone: "warn" as const, label: "unsaved" };
    if (savedAt) return { tone: "ok" as const, label: "saved" };
    return null;
  })();

  return (
    <header className="flex h-12 items-center gap-3 border-b border-zinc-200 bg-white px-3">
      <Link
        href={`/dashboard/templates/${templateSlug}`}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
        title="Back to template"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Back</span>
      </Link>
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-semibold text-zinc-800">
          {templateName}
        </span>
        <span className="font-mono text-[10px] text-zinc-400">
          v{version}
          {publishedAt ? " · published" : " · draft"}
        </span>
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
        {publishedAt ? (
          <button
            onClick={() =>
              fork.mutate({ templateId, documentJson: getDocument() })
            }
            disabled={fork.isPending}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Create a new draft version from this published version"
          >
            {fork.isPending ? "Forking…" : "Fork to new draft"}
          </button>
        ) : (
          <>
            <button
              onClick={save}
              disabled={!dirty || updateDraft.isPending}
              className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updateDraft.isPending ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => publish.mutate({ versionId })}
              disabled={publish.isPending || dirty}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              title={
                dirty ? "Save changes before publishing" : "Publish this version"
              }
            >
              {publish.isPending ? "Publishing…" : "Publish"}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
