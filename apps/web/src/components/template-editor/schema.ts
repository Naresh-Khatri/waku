import { z } from "zod";
import type { TemplateDocument } from "./types";

const ParamRefStringZ = z.object({
  $param: z.string(),
  default: z.string().optional(),
});

const ValueStringZ = z.union([z.string(), ParamRefStringZ]);

const ParamSchemaEntryZ = z.union([
  z.object({
    kind: z.literal("string"),
    default: z.string().optional(),
    maxLen: z.number().int().positive().optional(),
  }),
  z.object({
    kind: z.literal("url"),
    default: z.string().optional(),
  }),
  z.object({
    kind: z.literal("color"),
    default: z.string().optional(),
  }),
  z.object({
    kind: z.literal("number"),
    default: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  }),
  z.object({
    kind: z.literal("boolean"),
    default: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("enum"),
    values: z.tuple([z.string()]).rest(z.string()),
    default: z.string().optional(),
  }),
]);

const BaseFields = {
  id: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  opacity: z.number().min(0).max(1),
  visible: z.boolean(),
  locked: z.boolean(),
} as const;

const ImageNodeZ = z.object({
  ...BaseFields,
  type: z.literal("image"),
  src: ValueStringZ,
  fit: z.enum(["cover", "contain"]),
});

const TextNodeZ = z.object({
  ...BaseFields,
  type: z.literal("text"),
  text: ValueStringZ,
  fontSize: z.number().positive(),
  fontWeight: z.union([
    z.literal(400),
    z.literal(500),
    z.literal(600),
    z.literal(700),
    z.literal(800),
  ]),
  italic: z.boolean(),
  color: ValueStringZ,
  align: z.enum(["left", "center", "right"]),
  fontFamily: z.enum(["Inter"]),
  letterSpacing: z.number(),
  lineHeight: z.number().positive(),
});

const ShapeFields = {
  fill: ValueStringZ,
  stroke: ValueStringZ,
  strokeWidth: z.number().min(0),
} as const;

const RectangleNodeZ = z.object({
  ...BaseFields,
  ...ShapeFields,
  type: z.literal("rectangle"),
  cornerRadius: z.number().min(0),
});

const EllipseNodeZ = z.object({
  ...BaseFields,
  ...ShapeFields,
  type: z.literal("ellipse"),
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
  stroke: ValueStringZ,
  strokeWidth: z.number().min(0),
  arrow: z.boolean(),
});

export const EditorNodeZ = z.discriminatedUnion("type", [
  ImageNodeZ,
  TextNodeZ,
  RectangleNodeZ,
  EllipseNodeZ,
  TriangleNodeZ,
  StarNodeZ,
  LineNodeZ,
]);

const ArtboardZ = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  background: ValueStringZ,
});

export const TemplateDocumentZ = z.object({
  artboard: ArtboardZ,
  nodes: z.array(EditorNodeZ),
  paramsSchema: z.record(z.string(), ParamSchemaEntryZ),
}) satisfies z.ZodType<TemplateDocument>;

export const emptyTemplateDocument = (): TemplateDocument => ({
  artboard: { width: 1200, height: 630, background: "#ffffff" },
  nodes: [],
  paramsSchema: {},
});
