import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve as pathResolve } from "node:path";

export type LoadedFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 500 | 600 | 700 | 800 | 900;
  style: "normal" | "italic";
};

type FontSource = {
  family: string;
  weight: LoadedFont["weight"];
  style: LoadedFont["style"];
  /** Path relative to the renderer package's fonts/ directory. */
  file: string;
};

const FONT_SOURCES: FontSource[] = [
  { family: "Inter", weight: 400, style: "normal", file: "Inter-Regular.ttf" },
  { family: "Inter", weight: 600, style: "normal", file: "Inter-SemiBold.ttf" },
  { family: "Inter", weight: 700, style: "normal", file: "Inter-Bold.ttf" },
  { family: "Inter", weight: 800, style: "normal", file: "Inter-ExtraBold.ttf" },
];

/**
 * Resolve `<package>/fonts/<file>`. The renderer ships TTFs under its own
 * `fonts/` directory. Robust to both source (`src/fonts.ts`) and built layouts.
 */
const fontsDir = (() => {
  const here = dirname(fileURLToPath(import.meta.url));
  return pathResolve(here, "..", "fonts");
})();

let cached: Promise<LoadedFont[]> | null = null;

export const loadFonts = (): Promise<LoadedFont[]> => {
  if (cached) return cached;
  cached = Promise.all(
    FONT_SOURCES.map(async (s): Promise<LoadedFont> => {
      const buf = await readFile(join(fontsDir, s.file));
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
      return { name: s.family, data: ab, weight: s.weight, style: s.style };
    }),
  );
  return cached;
};

export const FONT_FAMILIES = ["Inter"] as const;
