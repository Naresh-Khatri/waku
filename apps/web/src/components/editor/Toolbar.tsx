"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/trpc/react";

import { RemixThemeButton } from "./RemixThemeButton";
import { useEditorStore, useEditorStoreApi } from "./StoreProvider";

const AUTO_SAVE_MS = 30_000;

export function Toolbar({
  templateId,
  versionId,
  isPublished,
  initialDirty,
}: {
  templateId: string;
  versionId: string;
  isPublished: boolean;
  initialDirty: boolean;
}) {
  const router = useRouter();
  const api2 = useEditorStoreApi();
  const dirty = useEditorStore((s) => s.dirty);
  const previewMode = useEditorStore((s) => s.previewMode);
  const setPreviewMode = useEditorStore((s) => s.setPreviewMode);
  const markClean = useEditorStore((s) => s.markClean);

  const updateDraft = api.template.updateDraft.useMutation();
  const createVersion = api.template.createVersion.useMutation();
  const publish = api.template.publish.useMutation();

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  const currentSnapshot = () => {
    const s = api2.getState();
    return { ir: s.ir, paramsSchema: s.paramsSchema };
  };

  const saveDraft = async () => {
    if (savingRef.current) return;
    if (isPublished) {
      // already-published versions can't be edited; force a new version
      return saveAsNewVersion();
    }
    savingRef.current = true;
    setError(null);
    try {
      const snap = currentSnapshot();
      await updateDraft.mutateAsync({
        versionId,
        irJson: snap.ir,
        paramsSchemaJson: snap.paramsSchema,
      });
      markClean();
      setLastSavedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      savingRef.current = false;
    }
  };

  const saveAsNewVersion = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setError(null);
    try {
      const snap = currentSnapshot();
      const next = await createVersion.mutateAsync({
        templateId,
        irJson: snap.ir,
        paramsSchemaJson: snap.paramsSchema,
      });
      markClean();
      setLastSavedAt(new Date());
      // navigate to the new version's edit page so subsequent saves hit updateDraft
      router.refresh();
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      savingRef.current = false;
    }
  };

  const onPublish = async () => {
    setError(null);
    try {
      let vid = versionId;
      if (dirty) {
        if (isPublished) {
          const next = await saveAsNewVersion();
          if (next?.id) vid = next.id;
        } else {
          await saveDraft();
        }
      }
      await publish.mutateAsync({ versionId: vid });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "publish failed");
    }
  };

  // auto-save drafts every 30s while dirty
  useEffect(() => {
    if (isPublished) return;
    const id = setInterval(() => {
      if (api2.getState().dirty) {
        void saveDraft();
      }
    }, AUTO_SAVE_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPublished, versionId]);

  // Cmd/Ctrl+S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveDraft();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId, isPublished]);

  // surface initial dirty state from server-vs-snapshot drift if needed
  useEffect(() => {
    if (initialDirty) {
      // no-op; reserved for future drift detection
    }
  }, [initialDirty]);

  const saving = updateDraft.isPending || createVersion.isPending;
  const publishing = publish.isPending;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <ModeToggle value={previewMode} onChange={setPreviewMode} />
      <button
        onClick={() => void saveDraft()}
        disabled={saving || !dirty}
        style={btn(dirty && !saving ? "primary" : "ghost")}
      >
        {saving ? "saving…" : "save draft"}
      </button>
      <button
        onClick={() => void onPublish()}
        disabled={publishing}
        style={btn("ghost")}
      >
        {publishing ? "publishing…" : isPublished ? "publish new version" : "publish"}
      </button>
      <RemixThemeButton />
      <div style={{ fontSize: 11, color: "#9ca3af", display: "flex", gap: 8, marginLeft: 4 }}>
        {error && <span style={{ color: "#ef4444" }}>{error}</span>}
        <span>
          {dirty
            ? "● unsaved"
            : lastSavedAt
              ? `saved ${formatTime(lastSavedAt)}`
              : "no changes"}
        </span>
      </div>
    </div>
  );
}

function ModeToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const segStyle = (active: boolean): CSSProperties => ({
    fontSize: 11,
    padding: "4px 10px",
    background: active ? "#7c5cff" : "transparent",
    color: active ? "white" : "#9ca3af",
    border: "none",
    cursor: "pointer",
  });
  return (
    <div
      style={{
        display: "inline-flex",
        border: "1px solid #1f2937",
        borderRadius: 6,
        overflow: "hidden",
      }}
    >
      <button onClick={() => onChange(false)} style={segStyle(!value)}>
        edit
      </button>
      <button onClick={() => onChange(true)} style={segStyle(value)}>
        preview
      </button>
    </div>
  );
}

const btn = (variant: "primary" | "ghost"): React.CSSProperties => ({
  fontSize: 12,
  padding: "6px 12px",
  borderRadius: 6,
  cursor: "pointer",
  background: variant === "primary" ? "#7c5cff" : "transparent",
  color: variant === "primary" ? "white" : "#e5e7eb",
  border: variant === "primary" ? "none" : "1px solid #1f2937",
});

const formatTime = (d: Date) => {
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return d.toLocaleTimeString();
};
