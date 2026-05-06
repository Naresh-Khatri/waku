/**
 * Main render pipeline: IR + params -> image buffer.
 *
 * Stages:
 *   1. Resolve param refs in the IR tree.
 *   2. Convert IR -> Satori JSX-object tree.
 *   3. Satori -> SVG string.
 *   4. Resvg -> PNG buffer.
 *   5. (optional) sharp transcode -> WebP / JPEG.
 */

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import {
  type Node,
  type ResolvedValues,
  resolve,
} from "@waku/ir";

import { loadFonts } from "./fonts";
import { toSatori } from "./satori-tree";

export type RenderFormat = "png" | "webp" | "jpeg";

export type RenderOptions = {
  /** Output format. Default "png". */
  format?: RenderFormat;
  /** Override the IR's frame width/height. Useful for thumbnails. */
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

const getFrameSize = (root: Node): { w: number; h: number } => {
  if (root.type !== "frame") {
    throw new Error("render: IR root must be a frame node");
  }
  return { w: root.w, h: root.h };
};

export const render = async (
  ir: Node,
  values: ResolvedValues,
  opts: RenderOptions = {},
): Promise<RenderResult> => {
  const format = opts.format ?? "png";
  const quality = opts.quality ?? 85;

  const resolved = resolve(ir, values);
  const { w, h } = getFrameSize(resolved);
  const targetW = opts.width ?? w;
  const targetH = opts.height ?? h;

  const tree = toSatori(resolved);
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
