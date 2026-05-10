"use client";

import { Plus, Trash2 } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { ColorPicker } from "./color-picker";
import type { ColorStop, Paint } from "./types";
import { isFlatPaint, paintToCss, resolveValue } from "./types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const POPOVER_WIDTH = 280;
const POPOVER_HEIGHT = 360;
const MARGIN = 8;

const CHECKER =
  "conic-gradient(#d4d4d8 25%, #fff 0 50%, #d4d4d8 0 75%, #fff 0)";

function swatchStyle(paint: Paint): CSSProperties {
  const css = paintToCss(paint, {});
  return {
    backgroundImage: `${css}, ${CHECKER}`,
    backgroundSize: "100% 100%, 8px 8px",
  };
}

function stopColorString(stop: ColorStop): string {
  const v = resolveValue(stop.color, {});
  return v ?? "#000000";
}

function defaultStops(seed?: string): ColorStop[] {
  return [
    { color: seed ?? "#6366f1", position: 0 },
    { color: "#ec4899", position: 1 },
  ];
}

function toLinear(paint: Paint): Paint {
  if (paint.kind === "linear") return paint;
  if (paint.kind === "radial")
    return { kind: "linear", angle: 90, stops: paint.stops };
  return { kind: "linear", angle: 90, stops: defaultStops(paintFlatString(paint)) };
}

function toRadial(paint: Paint): Paint {
  if (paint.kind === "radial") return paint;
  if (paint.kind === "linear")
    return { kind: "radial", cx: 0.5, cy: 0.5, stops: paint.stops };
  return {
    kind: "radial",
    cx: 0.5,
    cy: 0.5,
    stops: defaultStops(paintFlatString(paint)),
  };
}

function toFlat(paint: Paint): Paint {
  if (paint.kind === "flat") return paint;
  const first = paint.stops[0];
  const color = first ? stopColorString(first) : "#000000";
  return { kind: "flat", color };
}

function paintFlatString(paint: Paint): string | undefined {
  if (paint.kind !== "flat") return undefined;
  return resolveValue(paint.color, {}) ?? undefined;
}

interface PaintInputProps {
  value: Paint;
  onChange: (p: Paint) => void;
  label?: string;
  compact?: boolean;
  /** Param-bound flat paints render a chip and disable the popover. */
  boundChip?: { name: string } | null;
}

export function PaintInput({
  value,
  onChange,
  label,
  compact,
  boundChip,
}: PaintInputProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (boundChip) {
    return (
      <span
        title={`Bound to {${boundChip.name}}`}
        className={
          compact
            ? "flex h-7 items-center rounded-md border border-indigo-200 bg-indigo-50 px-2 font-mono text-[10px] text-indigo-700"
            : "flex h-7 w-full items-center rounded-md border border-indigo-200 bg-indigo-50 px-2 font-mono text-[11px] text-indigo-700"
        }
      >
        {`{${boundChip.name}}`}
      </span>
    );
  }

  if (compact) {
    return (
      <>
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label ?? "Paint"}
          onClick={() => setOpen((o) => !o)}
        >
          <span
            className="block h-5 w-5 rounded-full border border-zinc-300"
            style={swatchStyle(value)}
          />
        </Button>
        {open ? (
          <Popover
            triggerRef={triggerRef}
            value={value}
            onChange={onChange}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="flex w-full items-center gap-2">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-7 w-7 shrink-0 rounded border border-zinc-200 p-0"
        style={swatchStyle(value)}
        aria-label={label ?? "Color"}
      />
      <span className="flex h-7 flex-1 items-center rounded-md border border-zinc-200 bg-white px-2 text-[11px] text-zinc-600">
        {value.kind === "flat"
          ? (paintFlatString(value) ?? "—").toUpperCase()
          : value.kind === "linear"
            ? `Linear · ${value.angle}°`
            : `Radial · ${Math.round(value.cx * 100)}% ${Math.round(value.cy * 100)}%`}
      </span>
      {open ? (
        <Popover
          triggerRef={triggerRef}
          value={value}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function Popover({
  triggerRef,
  value,
  onChange,
  onClose,
}: {
  triggerRef: RefObject<HTMLButtonElement | null>;
  value: Paint;
  onChange: (p: Paint) => void;
  onClose: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const compute = () => {
      const t = triggerRef.current?.getBoundingClientRect();
      if (!t) return;
      let left = t.left;
      let top = t.bottom + MARGIN;
      if (left + POPOVER_WIDTH + MARGIN > window.innerWidth) {
        left = window.innerWidth - POPOVER_WIDTH - MARGIN;
      }
      if (left < MARGIN) left = MARGIN;
      if (top + POPOVER_HEIGHT + MARGIN > window.innerHeight) {
        top = t.top - POPOVER_HEIGHT - MARGIN;
      }
      if (top < MARGIN) top = MARGIN;
      setPos({ left, top });
    };
    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [triggerRef]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [triggerRef, onClose]);

  if (!pos || typeof document === "undefined") return null;

  const setKind = (kind: Paint["kind"]) => {
    if (value.kind === kind) return;
    if (kind === "flat") onChange(toFlat(value));
    else if (kind === "linear") onChange(toLinear(value));
    else onChange(toRadial(value));
  };

  return createPortal(
    <div
      ref={popoverRef}
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: POPOVER_WIDTH,
        zIndex: 50,
      }}
      className="rounded-lg border border-zinc-200 bg-white p-2 shadow-xl"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Tabs
        value={value.kind}
        onValueChange={(k) => setKind(k as Paint["kind"])}
        className="mb-2"
      >
        <TabsList className="w-full">
          <TabsTrigger value="flat" className="text-[11px]">
            Solid
          </TabsTrigger>
          <TabsTrigger value="linear" className="text-[11px]">
            Linear
          </TabsTrigger>
          <TabsTrigger value="radial" className="text-[11px]">
            Radial
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {value.kind === "flat" ? (
        <FlatBody value={value} onChange={onChange} />
      ) : value.kind === "linear" ? (
        <LinearBody value={value} onChange={onChange} />
      ) : (
        <RadialBody value={value} onChange={onChange} />
      )}
    </div>,
    document.body,
  );
}

function FlatBody({
  value,
  onChange,
}: {
  value: Paint;
  onChange: (p: Paint) => void;
}) {
  if (!isFlatPaint(value)) return null;
  const colorStr = paintFlatString(value) ?? "#000000";
  return (
    <ColorPicker
      value={colorStr}
      onChange={(c) => onChange({ kind: "flat", color: c })}
    />
  );
}

function LinearBody({
  value,
  onChange,
}: {
  value: Paint;
  onChange: (p: Paint) => void;
}) {
  if (value.kind !== "linear") return null;
  return (
    <div className="space-y-2">
      <PreviewBar paint={value} />
      <div>
        <Caption>Angle</Caption>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={value.angle}
            onChange={(e) =>
              onChange({ ...value, angle: parseInt(e.target.value, 10) })
            }
            className="flex-1 accent-indigo-500"
          />
          <span className="w-10 text-right font-mono text-[11px] text-zinc-600">
            {value.angle}°
          </span>
        </div>
      </div>
      <StopsEditor
        stops={value.stops}
        onChange={(stops) => onChange({ ...value, stops })}
      />
    </div>
  );
}

function RadialBody({
  value,
  onChange,
}: {
  value: Paint;
  onChange: (p: Paint) => void;
}) {
  if (value.kind !== "radial") return null;
  return (
    <div className="space-y-2">
      <PreviewBar paint={value} />
      <CenterPad
        cx={value.cx}
        cy={value.cy}
        onChange={(cx, cy) => onChange({ ...value, cx, cy })}
      />
      <StopsEditor
        stops={value.stops}
        onChange={(stops) => onChange({ ...value, stops })}
      />
    </div>
  );
}

function PreviewBar({ paint }: { paint: Paint }) {
  return (
    <div
      className="h-8 w-full rounded border border-zinc-200"
      style={swatchStyle(paint)}
    />
  );
}

function CenterPad({
  cx,
  cy,
  onChange,
}: {
  cx: number;
  cy: number;
  onChange: (cx: number, cy: number) => void;
}) {
  const padRef = useRef<HTMLDivElement>(null);
  const onPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = padRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    const update = (clientX: number, clientY: number) => {
      const nx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const ny = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      onChange(Number(nx.toFixed(3)), Number(ny.toFixed(3)));
    };
    update(e.clientX, e.clientY);
    const onMove = (ev: PointerEvent) => update(ev.clientX, ev.clientY);
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  return (
    <div>
      <Caption>Center</Caption>
      <div
        ref={padRef}
        onPointerDown={onPointer}
        className="relative h-20 w-full cursor-crosshair rounded border border-zinc-200 bg-zinc-50"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)",
          backgroundSize: "10% 25%",
        }}
      >
        <span
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-500 shadow"
          style={{ left: `${cx * 100}%`, top: `${cy * 100}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-zinc-500">
        <span>x {Math.round(cx * 100)}%</span>
        <span>y {Math.round(cy * 100)}%</span>
      </div>
    </div>
  );
}

function StopsEditor({
  stops,
  onChange,
}: {
  stops: ColorStop[];
  onChange: (stops: ColorStop[]) => void;
}) {
  const setAt = (i: number, patch: Partial<ColorStop>) => {
    onChange(stops.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };
  const remove = (i: number) => {
    if (stops.length <= 2) return;
    onChange(stops.filter((_, idx) => idx !== i));
  };
  const add = () => {
    const last = stops[stops.length - 1]!;
    const prev = stops[stops.length - 2] ?? last;
    const pos = Math.min(1, (last.position + prev.position) / 2 + 0.1);
    onChange([
      ...stops,
      { color: stopColorString(last), position: Number(pos.toFixed(3)) },
    ]);
  };
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <Caption>Stops</Caption>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={add}
          aria-label="Add stop"
          className="text-zinc-500"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-1">
        {stops.map((stop, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <ColorPicker
              compact
              value={stopColorString(stop)}
              onChange={(c) => setAt(i, { color: c })}
            />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={stop.position}
              onChange={(e) =>
                setAt(i, { position: parseFloat(e.target.value) })
              }
              className="flex-1 accent-indigo-500"
            />
            <span className="w-9 text-right font-mono text-[10px] text-zinc-500">
              {Math.round(stop.position * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => remove(i)}
              disabled={stops.length <= 2}
              aria-label="Remove stop"
              className="text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-[10px] uppercase tracking-wide text-zinc-400">
      {children}
    </div>
  );
}
