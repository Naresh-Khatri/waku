import { render, type RenderFormat } from "@waku/renderer";
import type { TemplateDocument } from "@waku/renderer/document";

const errorDoc = (title: string, message: string): TemplateDocument => ({
  artboard: { width: 1200, height: 630, background: "#1a0606" },
  paramsSchema: {},
  nodes: [
    {
      id: "accent",
      type: "rectangle",
      name: "accent",
      x: 80,
      y: 200,
      width: 64,
      height: 6,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      fill: "#ef4444",
      stroke: "transparent",
      strokeWidth: 0,
      cornerRadius: 3,
    },
    {
      id: "title",
      type: "text",
      name: "title",
      x: 80,
      y: 230,
      width: 1040,
      height: 140,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      text: title,
      fontSize: 64,
      fontWeight: 800,
      italic: false,
      color: "#fecaca",
      align: "left",
      fontFamily: "Inter",
      letterSpacing: 0,
      lineHeight: 1.1,
    },
    {
      id: "message",
      type: "text",
      name: "message",
      x: 80,
      y: 380,
      width: 1040,
      height: 200,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      text: message,
      fontSize: 28,
      fontWeight: 400,
      italic: false,
      color: "#fca5a5",
      align: "left",
      fontFamily: "Inter",
      letterSpacing: 0,
      lineHeight: 1.4,
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
) => render(errorDoc(title, message), {}, { format });
