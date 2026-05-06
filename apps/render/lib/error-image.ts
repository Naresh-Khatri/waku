import { render, type RenderFormat } from "@waku/renderer";
import type { Node } from "@waku/ir";

const errorIR = (title: string, message: string): Node => ({
  type: "frame",
  w: 1200,
  h: 630,
  bg: "#1a0606",
  children: [
    {
      type: "stack",
      dir: "col",
      gap: 24,
      pad: 80,
      w: "fill",
      h: "fill",
      justify: "center",
      align: "start",
      children: [
        {
          type: "shape",
          kind: "rect",
          w: 64,
          h: 6,
          radius: 3,
          fill: "#ef4444",
        },
        {
          type: "text",
          value: title,
          font: { family: "Inter", weight: 800 },
          size: 64,
          color: "#fecaca",
          lineHeight: 1.1,
          maxLines: 2,
        },
        {
          type: "text",
          value: message,
          font: { family: "Inter", weight: 400 },
          size: 28,
          color: "#fca5a5",
          lineHeight: 1.4,
          maxLines: 4,
        },
      ],
    },
  ],
});

/**
 * Build a PNG/WebP/JPEG buffer with an error card. Best-effort: if rendering
 * the error card fails, callers should fall back to JSON.
 */
export const renderErrorImage = (
  title: string,
  message: string,
  format: RenderFormat,
) => render(errorIR(title, message), {}, { format });
