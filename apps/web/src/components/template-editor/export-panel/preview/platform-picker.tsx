import { motion } from "motion/react";

import { PLATFORMS, PlatformIcon, type Platform } from "../og-preview";
import { TRANSITION } from "../constants";

export function PlatformPicker({
  platform,
  onPlatform,
}: {
  platform: Platform;
  onPlatform: (p: Platform) => void;
}) {
  return (
    <div className="flex shrink-0 border-t border-zinc-200 bg-white">
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div className="flex h-9 items-center gap-1 overflow-x-auto px-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PLATFORMS.map((p) => {
            const active = platform === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onPlatform(p.id)}
                title={p.label}
                aria-label={p.label}
                className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                  active
                    ? "text-white"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                }`}
              >
                {active ? (
                  <motion.span
                    layoutId="platform-pill"
                    transition={TRANSITION}
                    className="absolute inset-0 rounded-md bg-zinc-900"
                  />
                ) : null}
                <span className="relative flex items-center justify-center">
                  <PlatformIcon platform={p.id} />
                </span>
              </button>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent" />
      </div>
    </div>
  );
}
