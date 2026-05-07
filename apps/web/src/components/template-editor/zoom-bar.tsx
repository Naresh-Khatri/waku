"use client";

import { Maximize2, Minus, Plus } from "lucide-react";
import { useEditor } from "./store";

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

  const stepDown = () => {
    const next = [...STEPS].reverse().find((s) => s < scale - 0.001);
    setZoom(Math.max(MIN, next ?? MIN));
  };
  const stepUp = () => {
    const next = STEPS.find((s) => s > scale + 0.001);
    setZoom(Math.min(MAX, next ?? MAX));
  };

  return (
    <div className="absolute bottom-3 right-3 z-10 inline-flex h-9 items-center gap-1 rounded-xl border border-zinc-200 bg-white px-1.5 text-xs text-zinc-700 shadow-md">
      <button
        title="Fit to screen"
        onClick={() => setZoom("fit")}
        className={`flex h-7 items-center gap-1 rounded-md px-2 ${
          zoom === "fit" ? "bg-indigo-50 text-indigo-700" : "hover:bg-zinc-100"
        }`}
      >
        <Maximize2 className="h-3.5 w-3.5" />
        Fit
      </button>
      <span className="mx-1 h-4 w-px bg-zinc-200" />
      <button
        title="Zoom out"
        onClick={stepDown}
        className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-100"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <select
        value={zoom === "fit" ? "fit" : closestStep(scale)}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "fit") setZoom("fit");
          else setZoom(parseFloat(v));
        }}
        className="h-7 cursor-pointer rounded-md border border-zinc-200 bg-white px-2 text-xs outline-none hover:bg-zinc-50"
      >
        <option value="fit">Fit ({Math.round(fitScale * 100)}%)</option>
        {STEPS.map((s) => (
          <option key={s} value={s}>
            {Math.round(s * 100)}%
          </option>
        ))}
        {zoom !== "fit" && !STEPS.includes(zoom) ? (
          <option value={zoom}>{Math.round(scale * 100)}%</option>
        ) : null}
      </select>
      <button
        title="Zoom in"
        onClick={stepUp}
        className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-zinc-100"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
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
