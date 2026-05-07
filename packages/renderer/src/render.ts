/**
 * Flat-document render pipeline:
 *   TemplateDocument + draft values -> Satori tree -> SVG -> PNG (-> WebP/JPEG).
 */

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

import type { TemplateDocument } from "./document";
import { documentToSatori } from "./flat-tree";
import { loadFonts } from "./fonts";

export type RenderFormat = "png" | "webp" | "jpeg";

export type RenderOptions = {
  format?: RenderFormat;
  /** Override artboard width/height. */
  width?: number;
  height?: number;
  /** WebP/JPEG quality, 1..100. Default 85. */
  quality?: number;
};

export type RenderResult = {
  buffer: Buffer;
  contentType: string;
  format: RenderFormat;
  width: number;
  height: number;
};

const CONTENT_TYPES: Record<RenderFormat, string> = {
  png: "image/png",
  webp: "image/webp",
  jpeg: "image/jpeg",
};

export const render = async (
  doc: TemplateDocument,
  draft: Record<string, unknown>,
  opts: RenderOptions = {},
): Promise<RenderResult> => {
  const format = opts.format ?? "png";
  const quality = opts.quality ?? 85;

  const targetW = opts.width ?? doc.artboard.width;
  const targetH = opts.height ?? doc.artboard.height;

  const tree = documentToSatori(doc, draft);
  const fonts = await loadFonts();

  const svg = await satori(tree as never, {
    width: targetW,
    height: targetH,
    fonts: fonts.map((f) => ({
      name: f.name,
      data: f.data,
      weight: f.weight,
      style: f.style,
    })),
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: targetW },
  });
  const png = Buffer.from(resvg.render().asPng());

  let buffer: Buffer = png;
  if (format === "webp") {
    buffer = await sharp(png).webp({ quality }).toBuffer();
  } else if (format === "jpeg") {
    buffer = await sharp(png).jpeg({ quality }).toBuffer();
  }

  return {
    buffer,
    contentType: CONTENT_TYPES[format],
    format,
    width: targetW,
    height: targetH,
  };
};
