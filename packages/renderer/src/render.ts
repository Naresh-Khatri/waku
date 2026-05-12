/**
 * Flat-document render pipeline:
 *   TemplateDocument + draft values -> Satori tree -> SVG -> PNG (-> WebP/JPEG).
 */

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";

import type { TemplateDocument } from "./document";
import { documentToSatori, resolveImages, type ImageLoader } from "./flat-tree";
import { collectFontVariants, loadFonts } from "./fonts";

export type RenderFormat = "png" | "webp" | "jpeg";

export type RenderOptions = {
  format?: RenderFormat;
  /** Override artboard width/height. */
  width?: number;
  height?: number;
  /** WebP/JPEG quality, 1..100. Default 85. */
  quality?: number;
  /**
   * Optional loader for remote image URLs. When provided, http(s) `img.src`
   * values are pre-fetched through the loader (e.g. an SSRF-safe proxy) and
   * inlined as data URIs before being passed to satori. Without it, satori
   * will fetch remote URLs directly during rendering.
   */
  loadImage?: ImageLoader;
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

  const layoutW = doc.artboard.width;
  const layoutH = doc.artboard.height;
  const rasterW = opts.width ?? layoutW;
  const rasterH = opts.height ?? Math.round((rasterW * layoutH) / layoutW);

  const tree = documentToSatori(doc, draft);
  if (opts.loadImage) {
    await resolveImages(tree, opts.loadImage);
  }
  const fonts = await loadFonts(collectFontVariants(doc));

  const svg = await satori(tree as never, {
    width: layoutW,
    height: layoutH,
    fonts: fonts.map((f) => ({
      name: f.name,
      data: f.data,
      weight: f.weight,
      style: f.style,
    })),
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: rasterW },
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
    width: rasterW,
    height: rasterH,
  };
};
