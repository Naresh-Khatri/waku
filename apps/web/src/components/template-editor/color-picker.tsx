"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PRESETS = [
  "transparent",
  "#ffffff", "#e4e4e7", "#a1a1aa", "#52525b", "#27272a", "#000000",
  "#fee2e2", "#fca5a5", "#ef4444", "#dc2626", "#9f1239", "#7c2d12", "#451a03",
  "#fed7aa", "#fb923c", "#ea580c", "#facc15", "#eab308", "#a16207", "#713f12",
  "#bbf7d0", "#4ade80", "#16a34a", "#14532d", "#22d3ee", "#0891b2", "#164e63",
  "#bfdbfe", "#3b82f6", "#1d4ed8", "#6366f1", "#a855f7", "#ec4899", "#9d174d",
];

const TRANSPARENT = "#00000000";
const POPOVER_WIDTH = 240;
const POPOVER_HEIGHT = 260;
const MARGIN = 8;

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseHex(s: string): RGBA | null {
  if (s === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  const m = /^#?([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/.exec(s.trim());
  if (!m) return null;
  const rgb = m[1]!;
  const r = parseInt(rgb.slice(0, 2), 16);
  const g = parseInt(rgb.slice(2, 4), 16);
  const b = parseInt(rgb.slice(4, 6), 16);
  const a = m[2] ? parseInt(m[2], 16) / 255 : 1;
  return { r, g, b, a };
}

function toHex({ r, g, b, a }: RGBA): string {
  const hh = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  const rgb = `#${hh(r)}${hh(g)}${hh(b)}`;
  if (a >= 0.9999) return rgb;
  return `${rgb}${hh(a * 255)}`;
}

const CHECKER =
  "conic-gradient(#d4d4d8 25%, #fff 0 50%, #d4d4d8 0 75%, #fff 0)";

function checkerStyle(color: string): CSSProperties {
  return {
    backgroundImage: `linear-gradient(${color}, ${color}), ${CHECKER}`,
    backgroundSize: "100% 100%, 8px 8px",
  };
}

function transparentStyle(): CSSProperties {
  return {
    backgroundImage: `linear-gradient(135deg, transparent 45%, #ef4444 46% 54%, transparent 55%), ${CHECKER}`,
    backgroundSize: "100% 100%, 8px 8px",
  };
}

interface ColorPickerProps {
  value: string;
  onChange: (v: string) => void;
  compact?: boolean;
  label?: string;
}

export function ColorPicker({
  value,
  onChange,
  compact,
  label,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (compact) {
    return (
      <>
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label ?? "Color"}
          onClick={() => setOpen((o) => !o)}
        >
          <span
            className="block h-5 w-5 rounded-full border border-zinc-300"
            style={checkerStyle(value)}
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
        style={checkerStyle(value)}
        aria-label={label ?? "Color"}
      />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="h-7 font-mono text-xs uppercase"
      />
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
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [hex, setHex] = useState(value);

  useLayoutEffect(() => {
    setHex(value);
  }, [value]);

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

  const parsed = parseHex(value) ?? { r: 0, g: 0, b: 0, a: 1 };
  const alphaPct = Math.round(parsed.a * 100);

  const setAlpha = (a: number) => {
    onChange(toHex({ ...parsed, a: Math.max(0, Math.min(1, a)) }));
  };

  const commitHex = () => {
    const v = hex.trim();
    if (v === "transparent") {
      onChange(TRANSPARENT);
      return;
    }
    const parsedNew = parseHex(v);
    if (parsedNew) onChange(toHex(parsedNew));
    else setHex(value);
  };

  const solidRgb = `rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`;

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
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="grid grid-cols-7 gap-1">
        {PRESETS.map((c) => {
          const isTransparent = c === "transparent";
          const colorOut = isTransparent ? TRANSPARENT : c;
          const active = colorOut.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(colorOut)}
              title={isTransparent ? "Transparent" : c}
              className={cn(
                "h-6 w-6 rounded border",
                active
                  ? "border-indigo-500 ring-2 ring-indigo-200"
                  : "border-zinc-200",
              )}
              style={isTransparent ? transparentStyle() : checkerStyle(c)}
            />
          );
        })}
      </div>

      <div className="mt-2.5">
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-zinc-400">
          <span>Alpha</span>
          <span className="font-mono normal-case tracking-normal text-zinc-500">
            {alphaPct}%
          </span>
        </div>
        <div
          className="relative h-3 rounded"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(${parsed.r},${parsed.g},${parsed.b},0), ${solidRgb}), ${CHECKER}`,
            backgroundSize: "100% 100%, 8px 8px",
          }}
        >
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={alphaPct}
            onChange={(e) => setAlpha(parseInt(e.target.value, 10) / 100)}
            className="absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none bg-transparent accent-indigo-500 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-zinc-300 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
          />
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <span
          className="block h-7 w-7 shrink-0 rounded border border-zinc-200"
          style={checkerStyle(value)}
        />
        <Input
          type="text"
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          onBlur={commitHex}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commitHex();
              (e.target as HTMLInputElement).blur();
            }
          }}
          spellCheck={false}
          className="h-7 font-mono text-xs uppercase"
        />
      </div>
    </div>,
    document.body,
  );
}
