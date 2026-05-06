/**
 * Main render pipeline: IR + params -> PNG buffer.
 *
 * Stages:
 *   1. Resolve param refs in the IR tree.
 *   2. Convert IR -> Satori JSX-object tree.
 *   3. Satori -> SVG string.
 *   4. Resvg -> PNG buffer.
 *
 * WebP/JPEG support intentionally deferred. Default output is PNG.
 */

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import {
  type Node,
  type ResolvedValues,
  resolve,
} from "@waku/ir";

import { loadFonts } from "./fonts";
import { toSatori } from "./satori-tree";

export type RenderFormat = "png";

export type RenderOptions = {
  /** Output format. Only "png" supported in v1. */
  format?: RenderFormat;
  /** Override the IR's frame width/height. Useful for thumbnails. */
  width?: number;
  height?: number;
};

export type RenderResult = {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
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
  const png = resvg.render().asPng();
  const buffer = Buffer.from(png);

  return {
    buffer,
    contentType: "image/png",
    width: targetW,
    height: targetH,
  };
};
