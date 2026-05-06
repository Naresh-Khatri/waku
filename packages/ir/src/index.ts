export type {
  Align,
  Fill,
  FontRef,
  FrameNode,
  Gradient,
  GradientNode,
  GradientStop,
  ImageNode,
  Inset,
  Justify,
  Node,
  NodeType,
  ParamRef,
  ShapeNode,
  StackNode,
  TextNode,
  Value,
} from "./types.js";
export { isParamRef } from "./types.js";

export { NodeSchema, ParamRefSchema, TemplateIRSchema } from "./schema.js";

export type { ParamSchemaEntry, ParamsSchema } from "./params.js";
export {
  ParamsSchemaZ,
  paramsSchemaToZod,
  searchParamsToObject,
} from "./params.js";

export type { ResolvedValues } from "./resolve.js";
export {
  ParamResolutionError,
  collectParams,
  resolve,
} from "./resolve.js";

export type { ValidationResult } from "./validate.js";
export {
  findMissingParamDeclarations,
  validateIR,
  validateParams,
} from "./validate.js";
