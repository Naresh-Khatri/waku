// When tightening constraints here (min/max, regex, refinements), also update
// ai-prompt.ts — the system prompt is hand-written and won't reflect Zod-only
// rules automatically. Examples are validated by scripts/validate-ai-examples.ts.

import { z } from "zod";
import { FONT_FAMILY_VALUES } from "@waku/renderer/document";
import type { TemplateDocument } from "./types";

const ParamRefStringZ = z.object({
  $param: z.string(),
  default: z.string().optional(),
});

const ValueStringZ = z.union([z.string(), ParamRefStringZ]);

const ColorStopZ = z.object({
  color: ValueStringZ,
  position: z.number().min(0).max(1),
});

const FlatPaintZ = z.object({
  kind: z.literal("flat"),
  color: ValueStringZ,
});

const LinearPaintZ = z.object({
  kind: z.literal("linear"),
  angle: z.number(),
  stops: z.array(ColorStopZ).min(2),
});

const RadialPaintZ = z.object({
  kind: z.literal("radial"),
  cx: z.number().min(0).max(1),
  cy: z.number().min(0).max(1),
  stops: z.array(ColorStopZ).min(2),
});

const PaintZ = z.discriminatedUnion("kind", [
  FlatPaintZ,
  LinearPaintZ,
  RadialPaintZ,
]);

const ParamSchemaEntryZ = z.union([
  z.object({
    kind: z.literal("string"),
    default: z.string().optional(),
    maxLen: z.number().int().positive().optional(),
  }),
  z.object({
    kind: z.literal("color"),
    default: z.string().optional(),
  }),
]);

const BaseFields = {
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable().optional(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  opacity: z.number().min(0).max(1),
  visible: z.boolean(),
  locked: z.boolean(),
} as const;

const ShadowZ = z.object({
  offsetX: z.number(),
  offsetY: z.number(),
  blur: z.number().min(0),
  color: ValueStringZ,
});

const ImageNodeZ = z.object({
  ...BaseFields,
  type: z.literal("image"),
  src: ValueStringZ,
  fit: z.enum(["cover", "contain"]),
  cornerRadius: z.number().min(0),
  stroke: PaintZ,
  strokeWidth: z.number().min(0),
  shadow: ShadowZ.nullable(),
});

const FontWeightZ = z.union([
  z.literal(400),
  z.literal(500),
  z.literal(600),
  z.literal(700),
  z.literal(800),
]);

const TextNodeZ = z.object({
  ...BaseFields,
  type: z.literal("text"),
  text: ValueStringZ,
  fontSize: z.number().positive(),
  fontWeight: FontWeightZ,
  italic: z.boolean(),
  color: PaintZ,
  align: z.enum(["left", "center", "right"]),
  fontFamily: z.enum(FONT_FAMILY_VALUES),
  letterSpacing: z.number(),
  lineHeight: z.number().positive(),
  shadow: ShadowZ.nullable().optional(),
});

const ShapeFields = {
  fill: PaintZ,
  stroke: PaintZ,
  strokeWidth: z.number().min(0),
} as const;

const RectangleNodeZ = z.object({
  ...BaseFields,
  ...ShapeFields,
  type: z.literal("rectangle"),
  cornerRadius: z.number().min(0),
  shadow: ShadowZ.nullable().optional(),
});

const EllipseNodeZ = z.object({
  ...BaseFields,
  ...ShapeFields,
  type: z.literal("ellipse"),
  shadow: ShadowZ.nullable().optional(),
});

const TriangleNodeZ = z.object({
  ...BaseFields,
  ...ShapeFields,
  type: z.literal("triangle"),
});

const StarNodeZ = z.object({
  ...BaseFields,
  ...ShapeFields,
  type: z.literal("star"),
  points: z.number().int().min(3),
  innerRadiusRatio: z.number().min(0).max(1),
});

const LineNodeZ = z.object({
  ...BaseFields,
  type: z.literal("line"),
  stroke: PaintZ,
  strokeWidth: z.number().min(0),
  arrow: z.boolean(),
});

const PathNodeZ = z.object({
  ...BaseFields,
  ...ShapeFields,
  type: z.literal("path"),
  d: ValueStringZ,
  viewBox: z.tuple([z.number().positive(), z.number().positive()]),
  shadow: ShadowZ.nullable().optional(),
});

export const EditorNodeZ = z.discriminatedUnion("type", [
  ImageNodeZ,
  TextNodeZ,
  RectangleNodeZ,
  EllipseNodeZ,
  TriangleNodeZ,
  StarNodeZ,
  LineNodeZ,
  PathNodeZ,
]);

const ArtboardZ = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  background: PaintZ,
});

export const TemplateDocumentZ = z.object({
  artboard: ArtboardZ,
  nodes: z.array(EditorNodeZ),
  paramsSchema: z.record(z.string(), ParamSchemaEntryZ),
}) satisfies z.ZodType<TemplateDocument>;

export const emptyTemplateDocument = (): TemplateDocument => ({
  artboard: {
    width: 1200,
    height: 630,
    background: { kind: "flat", color: "#ffffff" },
  },
  nodes: [],
  paramsSchema: {},
});
