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
} from "./types";
export { isParamRef } from "./types";

export { NodeSchema, ParamRefSchema, TemplateIRSchema } from "./schema";

export type { ParamSchemaEntry, ParamsSchema } from "./params";
export {
  ParamsSchemaZ,
  paramsSchemaToZod,
  searchParamsToObject,
} from "./params";

export type { ResolvedValues } from "./resolve";
export {
  ParamResolutionError,
  collectParams,
  resolve,
} from "./resolve";

export type { ValidationResult } from "./validate";
export {
  findMissingParamDeclarations,
  validateIR,
  validateParams,
} from "./validate";
