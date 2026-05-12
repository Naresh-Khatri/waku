"use client";

import { useEffect } from "react";
import { getFontCss, type FontStyle, type FontWeight } from "@waku/fonts/css";

const injected = new Set<string>();
const inflight = new Map<string, Promise<void>>();

function key(family: string, weight: FontWeight, style: FontStyle): string {
  return `${family}|${weight}|${style}`;
}

async function ensureFont(
  family: string,
  weight: FontWeight,
  style: FontStyle,
): Promise<void> {
  const k = key(family, weight, style);
  if (injected.has(k)) return;
  const existing = inflight.get(k);
  if (existing) return existing;
  const p = (async () => {
    try {
      const { css } = await getFontCss({ family, weight, style });
      if (injected.has(k)) return;
      const el = document.createElement("style");
      el.dataset.font = k;
      el.textContent = css;
      document.head.appendChild(el);
      injected.add(k);
    } finally {
      inflight.delete(k);
    }
  })();
  inflight.set(k, p);
  return p;
}

/**
 * Lazily fetches a font from Bunny on the client and injects its @font-face
 * CSS into <head>. Safe to call repeatedly — de-duped across the whole app.
 *
 * Pass `enabled: false` to defer the fetch until a condition flips (e.g. the
 * dropdown opens). When `enabled` becomes true the fetch fires once.
 */
export function useLazyFont(
  family: string,
  opts: { weight?: FontWeight; style?: FontStyle; enabled?: boolean } = {},
): void {
  const weight = opts.weight ?? 400;
  const style = opts.style ?? "normal";
  const enabled = opts.enabled ?? true;
  useEffect(() => {
    if (!enabled) return;
    void ensureFont(family, weight, style);
  }, [family, weight, style, enabled]);
}

/** Eagerly warm a list of families. Use for picker previews. */
export function useLazyFonts(
  families: readonly string[],
  opts: { weight?: FontWeight; style?: FontStyle; enabled?: boolean } = {},
): void {
  const weight = opts.weight ?? 400;
  const style = opts.style ?? "normal";
  const enabled = opts.enabled ?? true;
  const familiesKey = families.join("|");
  useEffect(() => {
    if (!enabled) return;
    for (const f of families) void ensureFont(f, weight, style);
  }, [familiesKey, weight, style, enabled, families]);
}
