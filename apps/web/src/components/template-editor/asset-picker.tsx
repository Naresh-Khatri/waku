"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";

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

export function AssetPickerButton({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (src: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="text-xs text-zinc-700"
        >
          <ImageIcon className="h-3 w-3" />
          Library
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[80vh] w-[640px] max-w-[calc(100%-2rem)] flex-col gap-0 p-0 sm:max-w-[640px]">
        <DialogHeader className="border-b border-zinc-200 px-4 py-3">
          <DialogTitle className="text-sm font-semibold text-zinc-800">
            Asset library
          </DialogTitle>
        </DialogHeader>
        <AssetGrid
          onPick={(src) => {
            onPick(src);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function AssetGrid({ onPick }: { onPick: (src: string) => void }) {
  const list = api.asset.list.useQuery({ kind: "image" });
  const items = list.data ?? [];

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="p-4">
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
    </ScrollArea>
  );
}
