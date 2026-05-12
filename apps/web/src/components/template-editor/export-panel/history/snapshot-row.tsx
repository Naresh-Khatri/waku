import {
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ColoredUrl } from "./colored-url";

export type Snapshot = {
  id: string;
  version: number;
  label: string | null;
  createdAt: Date;
};

export function SnapshotRow({
  snapshot,
  url,
  restoring,
  onRestore,
  onRename,
  onDelete,
}: {
  snapshot: Snapshot;
  url: string;
  restoring: boolean;
  onRestore: () => void;
  onRename: (label: string | null) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(snapshot.label ?? "");
  const [copied, setCopied] = useState(false);

  const display = snapshot.label ?? `Snapshot v${snapshot.version}`;

  const submitRename = () => {
    const trimmed = label.trim();
    onRename(trimmed.length > 0 ? trimmed : null);
    setEditing(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <AccordionItem
      value={snapshot.id}
      className="border-b border-zinc-100 last:border-b-0"
    >
      <AccordionTrigger asChild>
        <div
          role="button"
          tabIndex={editing ? -1 : 0}
          className="group flex cursor-pointer items-start gap-2 px-3 py-3 text-left hover:bg-zinc-50 data-[state=open]:bg-zinc-50"
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-zinc-400 transition-transform duration-200 group-data-[state=open]:rotate-90">
            <ChevronRight className="h-3 w-3" />
          </span>
          <div className="min-w-0 flex-1">
            {editing ? (
              <Input
                autoFocus
                value={label}
                onClick={stop}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") submitRename();
                  if (e.key === "Escape") {
                    setLabel(snapshot.label ?? "");
                    setEditing(false);
                  }
                }}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={submitRename}
                placeholder="Name this snapshot"
                className="h-7 border-indigo-300 text-xs focus-visible:border-indigo-500"
              />
            ) : (
              <div className="flex min-w-0 items-center gap-1">
                <p className="min-w-0 truncate text-xs font-medium text-zinc-800">
                  {display}
                </p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        stop(e);
                        setEditing(true);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      aria-label="Rename"
                      className="size-5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Rename</TooltipContent>
                </Tooltip>
              </div>
            )}
            <p className="mt-0.5 text-[10px] text-zinc-400">
              {formatRelative(snapshot.createdAt)} · v{snapshot.version}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    stop(e);
                    onRestore();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  disabled={restoring}
                  aria-label="Restore"
                  className="text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <RotateCcw
                    className={cn("h-3.5 w-3.5", restoring && "animate-spin")}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {restoring ? "Restoring…" : "Restore"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    stop(e);
                    if (confirm(`Delete "${display}"?`)) onDelete();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Delete"
                  className="text-zinc-500 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-3 pb-3 pl-9">
        <code className="block min-w-0 break-all rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5 font-mono text-[10px] leading-relaxed">
          <ColoredUrl url={url} />
        </code>
        <div className="mt-2 flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={copy}
            className={cn(
              "text-[11px]",
              copied
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
                : "border-zinc-200 text-zinc-700",
            )}
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            asChild
            variant="outline"
            size="xs"
            className="border-zinc-200 text-[11px] text-zinc-700"
          >
            <a href={url} target="_blank" rel="noreferrer noopener">
              <ExternalLink className="h-3 w-3" />
              Open
            </a>
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function formatRelative(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const ms = Date.now() - date.getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
