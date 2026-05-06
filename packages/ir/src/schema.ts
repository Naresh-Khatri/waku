import { z } from "zod";
import type { Node } from "./types.js";

export const ParamRefSchema = z.object({
  $param: z.string().min(1),
  default: z.unknown().optional(),
});

const valueOf = <T extends z.ZodTypeAny>(literal: T) =>
  z.union([literal, ParamRefSchema]);

const NumberOrFill = z.union([z.number(), z.literal("fill")]);

const InsetSchema = z.union([
  z.number(),
  z.object({
    t: z.number().optional(),
    r: z.number().optional(),
    b: z.number().optional(),
    l: z.number().optional(),
  }),
]);

const FontRefSchema = z.object({
  family: z.string().min(1),
  weight: z.number().int().min(100).max(900).optional(),
  style: z.enum(["normal", "italic"]).optional(),
});

const GradientStopSchema = z.object({
  color: z.string().min(1),
  offset: z.number().min(0).max(1),
});

const GradientSchema = z.object({
  type: z.enum(["linear", "radial"]),
  stops: z.array(GradientStopSchema).min(2),
  angle: z.number().optional(),
});

const FillSchema = z.union([z.string(), GradientSchema, ParamRefSchema]);

const FrameSchemaBase = z.object({
  type: z.literal("frame"),
  w: z.number().positive(),
  h: z.number().positive(),
  bg: FillSchema.optional(),
});

const StackSchemaBase = z.object({
  type: z.literal("stack"),
  dir: z.enum(["row", "col"]),
  gap: z.number().nonnegative().optional(),
  align: z.enum(["start", "center", "end", "stretch"]).optional(),
  justify: z
    .enum(["start", "center", "end", "between", "around", "evenly"])
    .optional(),
  pad: InsetSchema.optional(),
  w: NumberOrFill.optional(),
  h: NumberOrFill.optional(),
  bg: FillSchema.optional(),
  radius: z.number().nonnegative().optional(),
});

const TextSchema = z.object({
  type: z.literal("text"),
  value: valueOf(z.string()),
  font: FontRefSchema,
  size: z.number().positive(),
  color: valueOf(z.string()),
  weight: z.number().int().min(100).max(900).optional(),
  tracking: z.number().optional(),
  lineHeight: z.number().positive().optional(),
  maxLines: z.number().int().positive().optional(),
  align: z.enum(["left", "center", "right"]).optional(),
});

const ImageSchema = z.object({
  type: z.literal("image"),
  src: valueOf(z.string()),
  fit: z.enum(["cover", "contain"]),
  w: z.number().positive().optional(),
  h: z.number().positive().optional(),
  radius: z.number().nonnegative().optional(),
});

const ShapeSchema = z.object({
  type: z.literal("shape"),
  kind: z.enum(["rect", "circle"]),
  w: z.number().positive(),
  h: z.number().positive(),
  fill: FillSchema.optional(),
  radius: z.number().nonnegative().optional(),
});

const GradientNodeSchema = z.object({
  type: z.literal("gradient"),
  w: z.number().positive(),
  h: z.number().positive(),
  gradient: GradientSchema,
  radius: z.number().nonnegative().optional(),
});

// Recursive Node — children reference NodeSchema via z.lazy.
// Typed as ZodTypeAny to break the cycle; consumers go through validateIR
// (validate.ts) to get a Node-typed result.
export const NodeSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    FrameSchemaBase.extend({
      children: z.array(NodeSchema).optional(),
    }),
    StackSchemaBase.extend({
      children: z.array(NodeSchema).optional(),
    }),
    TextSchema,
    ImageSchema,
    ShapeSchema,
    GradientNodeSchema,
  ]),
);

/** Root must be a frame. */
export const TemplateIRSchema = NodeSchema.refine(
  (n: { type: string }) => n.type === "frame",
  { message: "Template root must be a frame node" },
);

// Re-export Node for callers that want the type without importing types.ts.
export type { Node };
