"use client";

import { DownloadButton } from "./download-button";

export function TopBar() {
  return (
    <div className="flex h-12 shrink-0 items-center gap-1 border-b border-zinc-200 bg-white px-3">
      <span className="text-sm font-semibold tracking-tight text-zinc-900">
        Mock Editor
      </span>
      <div className="ml-auto">
        <DownloadButton />
      </div>
    </div>
  );
}
