"use client";

import { Sparkles } from "lucide-react";

// Placeholder for the expanding chat overlay. Renders the collapsed composer
// pill anchored at the bottom of the dashboard; clicking it currently no-ops
// until the full overlay (history, suggestions, streaming chat) lands.
export function ChatComposer() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-6">
      <button
        type="button"
        disabled
        className="pointer-events-auto flex w-full max-w-2xl items-center gap-2 rounded-full border border-[#1f2937] bg-[#0b0f1a]/95 px-4 py-3 text-sm text-[#6b7280] shadow-lg backdrop-blur transition disabled:cursor-not-allowed"
      >
        <Sparkles className="h-4 w-4 text-[#7c5cff]" />
        <span className="flex-1 text-left">
          Describe what you want to design…
        </span>
        <span className="rounded-md border border-[#1f2937] px-2 py-0.5 font-mono text-[10px] text-[#6b7280]">
          coming soon
        </span>
      </button>
    </div>
  );
}
