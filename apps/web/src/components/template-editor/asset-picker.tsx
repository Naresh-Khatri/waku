"use client";

import { useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";

import { api } from "@/trpc/react";

export function AssetPickerButton({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (src: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="inline-flex h-7 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
      >
        <ImageIcon className="h-3 w-3" />
        Library
      </button>
      {open ? (
        <AssetPickerModal
          onClose={() => setOpen(false)}
          onPick={(src) => {
            onPick(src);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function AssetPickerModal({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (src: string) => void;
}) {
  const list = api.asset.list.useQuery({ kind: "image" });
  const items = list.data ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-[640px] max-w-full flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-zinc-800">Asset library</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {list.isPending ? (
            <p className="text-xs text-zinc-500">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-zinc-500">
              No uploads yet. Use the Upload row to add an image.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {items.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onPick(a.readUrl)}
                  className="group relative aspect-square overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 hover:border-indigo-400"
                  title={a.storageKey}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.readUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
