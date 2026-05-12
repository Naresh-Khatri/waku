"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { DownloadButton } from "@/components/template-editor/download-button";
import { Editor } from "@/components/template-editor/editor";
import { JsonIoButton } from "@/components/template-editor/json-io";
import { useEditor } from "@/components/template-editor/store";
import type { TemplateDocument } from "@/components/template-editor/types";
import { api } from "@/trpc/react";

const AUTOSAVE_DEBOUNCE_MS = 800;

type Props = {
  id: string;
  slug: string;
  name: string;
  document: TemplateDocument;
  published: boolean;
  liveUrl: string;
};

export default function AdminEditorShell(props: Props) {
  const loadDocument = useEditor((s) => s.loadDocument);

  useEffect(() => {
    loadDocument(props.document);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id]);

  return (
    <div className="fixed inset-0 z-50">
      <Editor
        enableParams
        liveUrl={props.liveUrl}
        topBar={<AdminTopBar {...props} />}
      />
    </div>
  );
}

function AdminTopBar({ id, slug, name, published }: Props) {
  const utils = api.useUtils();
  const dirty = useEditor((s) => s.dirty);
  const getDocument = useEditor((s) => s.getDocument);
  const markClean = useEditor((s) => s.markClean);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [publishedState, setPublishedState] = useState(published);

  const update = api.admin.stockUpdate.useMutation({
    onSuccess: () => {
      setSavedAt(Date.now());
      setSaveError(null);
      markClean();
    },
    onError: (err) => setSaveError(err.message),
  });

  const publish = api.admin.stockPublish.useMutation({
    onSuccess: () => {
      setPublishedState(true);
      void utils.admin.stockList.invalidate();
    },
    onError: (err) => setSaveError(err.message),
  });

  const unpublish = api.admin.stockUnpublish.useMutation({
    onSuccess: () => {
      setPublishedState(false);
      void utils.admin.stockList.invalidate();
    },
    onError: (err) => setSaveError(err.message),
  });

  const saveTimerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  const save = () => {
    if (inFlightRef.current || update.isPending) return;
    inFlightRef.current = true;
    update.mutate(
      { id, documentJson: getDocument() },
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
    if (update.isPending) return { tone: "info" as const, label: "saving…" };
    if (dirty) return { tone: "warn" as const, label: "unsaved" };
    if (savedAt) return { tone: "ok" as const, label: "saved" };
    return null;
  })();

  return (
    <header className="flex h-12 items-center gap-3 border-b border-zinc-200 bg-white px-3">
      <Link
        href="/admin/templates"
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Back</span>
      </Link>
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-semibold text-zinc-800">
          {name}
        </span>
        <span className="font-mono text-[10px] text-zinc-400">/{slug}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] tracking-wide uppercase ${
            publishedState
              ? "bg-emerald-100 text-emerald-700"
              : "bg-zinc-100 text-zinc-500"
          }`}
        >
          {publishedState ? "published" : "draft"}
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
        <JsonIoButton />
        <DownloadButton filename={slug} />
        {publishedState ? (
          <button
            type="button"
            disabled={unpublish.isPending}
            onClick={() => unpublish.mutate({ id })}
            className="rounded-md border border-zinc-200 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
          >
            {unpublish.isPending ? "Unpublishing…" : "Unpublish"}
          </button>
        ) : null}
        <button
          type="button"
          disabled={publish.isPending || dirty}
          title={dirty ? "Save your changes first" : "Render thumbnail + publish"}
          onClick={() => publish.mutate({ id })}
          className="rounded-md bg-[#7c5cff] px-3 py-1 text-xs font-medium text-white hover:bg-[#6b4be0] disabled:opacity-40"
        >
          {publish.isPending
            ? "Publishing…"
            : publishedState
              ? "Republish"
              : "Publish"}
        </button>
      </div>
    </header>
  );
}
