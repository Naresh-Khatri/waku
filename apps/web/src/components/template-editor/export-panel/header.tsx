import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { StatusDot, type RenderStatus } from "../og-preview";

export type Tab = "preview" | "history";

export function Header({
  tab,
  onTab,
  snapshotCount,
  status,
  onClose,
}: {
  tab: Tab;
  onTab: (tab: Tab) => void;
  snapshotCount: number;
  // null hides the status pill (e.g. on the History tab where it's irrelevant).
  status: RenderStatus | null;
  onClose: () => void;
}) {
  return (
    <header className="flex h-9 shrink-0 items-center gap-1 border-b border-zinc-200 px-2">
      <TabButton active={tab === "preview"} onClick={() => onTab("preview")}>
        preview
      </TabButton>
      <TabButton active={tab === "history"} onClick={() => onTab("history")}>
        History
        {snapshotCount > 0 ? (
          <span
            className={`ml-1 text-[10px] ${
              tab === "history" ? "text-zinc-300" : "text-zinc-400"
            }`}
          >
            {snapshotCount}
          </span>
        ) : null}
      </TabButton>
      <div className="ml-auto flex items-center gap-1.5">
        {status ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200 bg-white shadow-sm">
                <StatusDot status={status} />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {status.kind === "ok"
                ? `rendered in ${status.ms}ms`
                : status.kind === "loading"
                  ? "rendering…"
                  : status.kind === "error"
                    ? status.message
                    : "idle"}
            </TooltipContent>
          </Tooltip>
        ) : null}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onClose}
              aria-label="Hide"
              className="border border-zinc-200 bg-zinc-100 text-zinc-600 shadow-sm hover:border-zinc-300 hover:bg-zinc-200 hover:text-zinc-900"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Hide</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-7 px-2.5 text-[11px] font-semibold uppercase tracking-wide",
        active
          ? "bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800",
      )}
    >
      {children}
    </Button>
  );
}
