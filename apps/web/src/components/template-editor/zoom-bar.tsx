"use client";

import { Maximize2, Minus, Plus } from "lucide-react";
import { useEditor } from "./store";
import { useIsMobile } from "./use-is-mobile";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const STEPS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];
const MIN = 0.05;
const MAX = 8;

export function ZoomBar({
  scale,
  fitScale,
}: {
  scale: number;
  fitScale: number;
}) {
  const zoom = useEditor((s) => s.zoom);
  const setZoom = useEditor((s) => s.setZoom);
  const hasSelection = useEditor((s) => s.selectedId != null);
  const isMobile = useIsMobile();

  // On mobile the contextual bar (h-11) overlays the canvas bottom whenever a
  // node is selected; lift the zoom bar clear of it so it isn't covered.
  const raised = isMobile && hasSelection;

  const stepDown = () => {
    const next = [...STEPS].reverse().find((s) => s < scale - 0.001);
    setZoom(Math.max(MIN, next ?? MIN));
  };
  const stepUp = () => {
    const next = STEPS.find((s) => s > scale + 0.001);
    setZoom(Math.min(MAX, next ?? MAX));
  };

  const selectValue = zoom === "fit" ? "fit" : String(closestStep(scale));

  return (
    <div
      className={cn(
        "absolute right-3 z-10 inline-flex h-9 items-center gap-1 rounded-xl border border-zinc-200 bg-white px-1.5 text-xs text-zinc-700 shadow-md transition-[bottom] duration-150",
        raised ? "bottom-[4.5rem]" : "bottom-3",
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setZoom("fit")}
            className={cn(
              "gap-1",
              zoom === "fit" &&
                "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
            )}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Fit
          </Button>
        </TooltipTrigger>
        <TooltipContent>Fit to screen</TooltipContent>
      </Tooltip>
      <Separator orientation="vertical" className="mx-1 !h-4" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={stepDown}
            aria-label="Zoom out"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom out</TooltipContent>
      </Tooltip>
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === "fit") setZoom("fit");
          else setZoom(parseFloat(v));
        }}
      >
        <SelectTrigger size="sm" className="text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fit" className="text-xs">
            {`Fit (${Math.round(fitScale * 100)}%)`}
          </SelectItem>
          {STEPS.map((s) => (
            <SelectItem key={s} value={String(s)} className="text-xs">
              {Math.round(s * 100)}%
            </SelectItem>
          ))}
          {zoom !== "fit" && !STEPS.includes(zoom) ? (
            <SelectItem value={String(zoom)} className="text-xs">
              {Math.round(scale * 100)}%
            </SelectItem>
          ) : null}
        </SelectContent>
      </Select>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={stepUp}
            aria-label="Zoom in"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom in</TooltipContent>
      </Tooltip>
    </div>
  );
}

function closestStep(scale: number) {
  let best = STEPS[0]!;
  let dist = Math.abs(scale - best);
  for (const s of STEPS) {
    const d = Math.abs(scale - s);
    if (d < dist) {
      best = s;
      dist = d;
    }
  }
  return best;
}
