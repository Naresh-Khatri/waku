import { tool } from "ai";
import { z } from "zod";

import type { EditorNode, TemplateDocument } from "@/components/template-editor/types";

const ToolNodeZ = z.object({
  type: z
    .string()
    .describe(
      'node type — must be "text", "rectangle", or "ellipse". Unknown types are dropped.',
    ),
  id: z.string().describe("unique node id (e.g. 'n1')"),
  x: z.number().describe("x position in artboard pixels (0 = left edge)"),
  y: z.number().describe("y position in artboard pixels (0 = top edge)"),
  width: z.number().describe("width in pixels (must be > 0)"),
  height: z.number().describe("height in pixels (must be > 0)"),

  text: z
    .string()
    .optional()
    .describe("required when type=text — the text content"),
  fontSize: z
    .number()
    .optional()
    .describe("required when type=text — font size in px (must be > 0)"),
  fontWeight: z
    .number()
    .optional()
    .describe(
      "required when type=text — 400, 500, 600, 700, or 800",
    ),
  color: z
    .string()
    .optional()
    .describe("required when type=text — hex color #rrggbb"),
  align: z
    .enum(["left", "center", "right"])
    .optional()
    .describe("required when type=text — horizontal alignment"),
  italic: z
    .boolean()
    .optional()
    .describe("optional when type=text — italics"),

  fill: z
    .string()
    .optional()
    .describe(
      "required when type=rectangle or ellipse — hex fill color #rrggbb",
    ),
  cornerRadius: z
    .number()
    .optional()
    .describe("optional when type=rectangle — corner radius in px"),
});

export const DesignInputZ = z.object({
  name: z.string().describe("short title for this design (max 60 chars)"),
  artboard: z.object({
    width: z.number().describe("artboard width in pixels (use 1200)"),
    height: z.number().describe("artboard height in pixels (use 630)"),
    background: z.string().describe("hex background color #rrggbb"),
  }),
  nodes: z
    .array(ToolNodeZ)
    .min(1)
    .describe("nodes in z-order — first renders behind, last in front"),
});

export type DesignInput = z.infer<typeof DesignInputZ>;
type ToolNode = z.infer<typeof ToolNodeZ>;

const clampWeight = (w: number): 400 | 500 | 600 | 700 | 800 => {
  if (w >= 750) return 800;
  if (w >= 650) return 700;
  if (w >= 550) return 600;
  if (w >= 450) return 500;
  return 400;
};

const TYPE_SYNONYMS: Record<string, "text" | "rectangle" | "ellipse"> = {
  text: "text",
  heading: "text",
  title: "text",
  label: "text",
  paragraph: "text",
  string: "text",
  rectangle: "rectangle",
  rect: "rectangle",
  box: "rectangle",
  square: "rectangle",
  shape: "rectangle",
  ellipse: "ellipse",
  circle: "ellipse",
  oval: "ellipse",
  dot: "ellipse",
};

function toEditorNode(n: ToolNode, i: number): EditorNode | null {
  const kind = TYPE_SYNONYMS[n.type.toLowerCase()];
  if (!kind) return null;
  if (!Number.isFinite(n.width) || n.width <= 0) return null;
  if (!Number.isFinite(n.height) || n.height <= 0) return null;
  if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) return null;

  const base = {
    id: n.id || `n${i + 1}`,
    name: `Node ${i + 1}`,
    x: n.x,
    y: n.y,
    width: n.width,
    height: n.height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
  };

  if (kind === "text") {
    if (
      typeof n.text !== "string" ||
      typeof n.fontSize !== "number" ||
      !Number.isFinite(n.fontSize) ||
      n.fontSize <= 0 ||
      typeof n.fontWeight !== "number" ||
      typeof n.color !== "string"
    ) {
      return null;
    }
    return {
      ...base,
      type: "text",
      text: n.text,
      fontSize: Math.round(n.fontSize),
      fontWeight: clampWeight(n.fontWeight),
      italic: n.italic ?? false,
      color: n.color,
      align: n.align ?? "left",
      fontFamily: "Inter",
      letterSpacing: 0,
      lineHeight: 1.2,
    };
  }

  if (typeof n.fill !== "string") return null;
  const shapeBase = {
    ...base,
    fill: n.fill,
    stroke: "#000000",
    strokeWidth: 0,
  };
  if (kind === "rectangle") {
    return {
      ...shapeBase,
      type: "rectangle",
      cornerRadius: Math.max(0, n.cornerRadius ?? 0),
    };
  }
  return { ...shapeBase, type: "ellipse" };
}

const normalizeHex = (s: string) => s.trim().toLowerCase();

function expand(input: DesignInput): TemplateDocument {
  const aw =
    Number.isFinite(input.artboard.width) && input.artboard.width > 0
      ? Math.round(input.artboard.width)
      : 1200;
  const ah =
    Number.isFinite(input.artboard.height) && input.artboard.height > 0
      ? Math.round(input.artboard.height)
      : 630;
  const bg = input.artboard.background;
  const bgKey = normalizeHex(bg);

  const editorNodes = input.nodes
    .map((n, i) => toEditorNode(n, i))
    .filter((n): n is EditorNode => n !== null)
    // Drop shapes whose fill matches the artboard background — they're invisible noise.
    .filter((n) => {
      if (n.type !== "rectangle" && n.type !== "ellipse") return true;
      if (typeof n.fill !== "string") return true;
      return normalizeHex(n.fill) !== bgKey;
    });

  // Force text to render on top regardless of LLM's array order.
  const shapes = editorNodes.filter((n) => n.type !== "text");
  const texts = editorNodes.filter((n) => n.type === "text");
  const nodes = [...shapes, ...texts];

  return {
    artboard: { width: aw, height: ah, background: bg },
    nodes,
    paramsSchema: {},
  };
}

export const proposeDesignTool = tool({
  description:
    "Propose one complete OG image design (1200×630). Call 2–3 times per user request with visually distinct variations.",
  inputSchema: DesignInputZ,
  execute: async (input) => {
    return { name: input.name, document: expand(input) };
  },
});

export type ProposeDesignOutput = {
  name: string;
  document: TemplateDocument;
};
