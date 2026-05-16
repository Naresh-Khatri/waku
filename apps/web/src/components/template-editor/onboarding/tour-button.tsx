"use client";

import { GraduationCap } from "lucide-react";
import { useEffect, useRef } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useIsMobile } from "../use-is-mobile";
import { useVariablesTour } from "./use-variables-tour";

const SEEN_KEY = "wk:varTourSeen";

/**
 * Left-rail entry point for the variables walkthrough, styled to match the
 * rail's icon tabs. Auto-starts once per browser on first visit; clicking
 * replays it on demand. Skipped on mobile, where the editor uses a
 * different (drawer-based) layout the tour isn't anchored against.
 */
export function VariablesTourButton() {
  const isMobile = useIsMobile();
  const { start } = useVariablesTour();
  const autoFired = useRef(false);

  const markSeen = () => window.localStorage.setItem(SEEN_KEY, "1");

  // Until they've finished once, the tour is locked (no overlay-close);
  // after that, replays close freely.
  const run = () => {
    const seen = !!window.localStorage.getItem(SEEN_KEY);
    start({ enforce: !seen, onComplete: markSeen });
  };

  useEffect(() => {
    if (isMobile || autoFired.current) return;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(SEEN_KEY)) return;
    autoFired.current = true;
    // Only mark seen once they actually finish — bail early and it
    // greets them again next visit.
    const t = window.setTimeout(run, 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, start]);

  if (isMobile) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={run}
          className="flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-md text-[10px] font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
        >
          <GraduationCap className="h-4 w-4" />
          <span>Tour</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">Replay the variables tour</TooltipContent>
    </Tooltip>
  );
}
