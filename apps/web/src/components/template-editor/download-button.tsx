"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useEditorConfig } from "./editor-config";
import { useEditor } from "./store";
import { effectiveParams } from "./types";
import { searchFromParams } from "./url-params";

function inferExtension(url: string, contentType: string | null): string {
  if (contentType) {
    if (contentType.includes("png")) return "png";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
    if (contentType.includes("webp")) return "webp";
    if (contentType.includes("svg")) return "svg";
  }
  try {
    const fmt = new URL(url).searchParams.get("format");
    if (fmt) return fmt;
  } catch {}
  return "png";
}

export function DownloadButton({ filename = "og-image" }: { filename?: string }) {
  const { liveUrl } = useEditorConfig();
  const paramsSchema = useEditor((s) => s.paramsSchema);
  const draftValues = useEditor((s) => s.draftValues);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    if (!liveUrl || pending) return;
    setPending(true);
    setError(null);
    try {
      const qs = searchFromParams(
        effectiveParams(paramsSchema, draftValues),
        paramsSchema,
      ).toString();
      const url =
        qs.length === 0
          ? liveUrl
          : `${liveUrl}${liveUrl.includes("?") ? "&" : "?"}${qs}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const header = res.headers.get("x-waku-error");
        throw new Error(header || res.statusText || "render failed");
      }
      const blob = await res.blob();
      const ext = inferExtension(url, res.headers.get("content-type"));
      const obj = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = obj;
      a.download = `${filename}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(obj);
    } catch (e) {
      setError(e instanceof Error ? e.message : "download failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={!liveUrl || pending}
      onClick={onClick}
      title={error ?? (liveUrl ? "Download rendered image" : "No live URL")}
      className="h-7 gap-1.5 px-2 text-xs text-zinc-700"
    >
      <Download className="h-3.5 w-3.5" />
      {pending ? "Downloading…" : "Download"}
    </Button>
  );
}
