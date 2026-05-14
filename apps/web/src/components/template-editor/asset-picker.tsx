"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useRef, useState } from "react";
import { Image as ImageIcon, Upload } from "lucide-react";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { AssetUploadError, useAssetUploader } from "./asset-upload";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";

export function AssetPicker({
  trigger,
  onPick,
}: {
  trigger: ReactNode;
  onPick: (src: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[80vh] w-[640px] max-w-[calc(100%-2rem)] flex-col gap-0 p-0 sm:max-w-[640px]">
        <AssetLibrary
          onPick={(src) => {
            onPick(src);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export function AssetPickerButton({
  disabled,
  onPick,
  className,
  label = "Library",
  icon,
}: {
  disabled: boolean;
  onPick: (src: string) => void;
  className?: string;
  label?: string;
  icon?: ReactNode;
}) {
  return (
    <AssetPicker
      trigger={
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn("text-xs text-zinc-700", className)}
        >
          {icon ?? <ImageIcon className="h-3 w-3" />}
          {label}
        </Button>
      }
      onPick={onPick}
    />
  );
}

function AssetLibrary({ onPick }: { onPick: (src: string) => void }) {
  const { upload, isUploading } = useAssetUploader();
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    setError(null);
    try {
      const { readUrl } = await upload(file);
      onPick(readUrl);
    } catch (err) {
      setError(
        err instanceof AssetUploadError
          ? err.message
          : "Upload failed. Try again.",
      );
    }
  };

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await uploadFile(file);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) void uploadFile(file);
      }}
      className="relative flex min-h-0 flex-1 flex-col"
    >
      <DialogHeader className="border-b border-zinc-200 px-4 py-3">
        <DialogTitle className="text-sm font-semibold text-zinc-800">
          Asset library
        </DialogTitle>
      </DialogHeader>
      <AssetGrid
        onPick={onPick}
        onUploadClick={() => fileRef.current?.click()}
        isUploading={isUploading}
      />
      {error ? (
        <div className="border-t border-red-100 bg-red-50 px-4 py-2 text-[11px] text-red-600">
          {error}
        </div>
      ) : null}
      {dragOver ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg border-2 border-dashed border-indigo-400 bg-indigo-50/80 text-sm font-medium text-indigo-700">
          Drop to upload
        </div>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        onChange={onFileChange}
        className="hidden"
      />
    </div>
  );
}

function AssetGrid({
  onPick,
  onUploadClick,
  isUploading,
}: {
  onPick: (src: string) => void;
  onUploadClick: () => void;
  isUploading: boolean;
}) {
  const list = api.asset.list.useQuery({ kind: "image" });
  const items = list.data ?? [];

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="p-4">
        <div className="columns-2 gap-3 sm:columns-3">
          <button
            type="button"
            onClick={onUploadClick}
            disabled={isUploading}
            className="mb-3 flex aspect-video w-full break-inside-avoid flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-zinc-300 bg-zinc-50 text-zinc-500 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            <span className="text-[11px] font-medium">
              {isUploading ? "Uploading…" : "Upload"}
            </span>
          </button>
          {list.isPending ? (
            <p className="text-xs text-zinc-500">Loading…</p>
          ) : (
            items.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onPick(a.readUrl)}
                className="group relative mb-3 block w-full overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 break-inside-avoid hover:border-indigo-400"
                title={a.storageKey}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.readUrl}
                  alt=""
                  className="block h-auto w-full"
                />
              </button>
            ))
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
