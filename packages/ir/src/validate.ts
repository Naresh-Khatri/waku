import type { z } from "zod";
import { TemplateIRSchema } from "./schema";
import { paramsSchemaToZod, searchParamsToObject, type ParamsSchema } from "./params";
import { collectParams } from "./resolve";
import type { Node } from "./types";

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: z.ZodError };

export const validateIR = (ir: unknown): ValidationResult<Node> => {
  const parsed = TemplateIRSchema.safeParse(ir);
  if (parsed.success) return { ok: true, value: parsed.data as Node };
  return { ok: false, error: parsed.error };
};

export const validateParams = (
  schema: ParamsSchema,
  input: URLSearchParams | Record<string, unknown>,
): ValidationResult<Record<string, unknown>> => {
  const obj = input instanceof URLSearchParams ? searchParamsToObject(input) : input;
  const zod = paramsSchemaToZod(schema);
  const parsed = zod.safeParse(obj);
  if (parsed.success) return { ok: true, value: parsed.data };
  return { ok: false, error: parsed.error };
};

/**
 * Cross-check that every {$param} reference in `ir` has a corresponding
 * entry in `paramsSchema`. Returns missing param names (empty if consistent).
 */
export const findMissingParamDeclarations = (
  ir: Node,
  paramsSchema: ParamsSchema,
): string[] => {
  const referenced = collectParams(ir);
  const declared = new Set(Object.keys(paramsSchema));
  return [...referenced].filter((p) => !declared.has(p));
};
