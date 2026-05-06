/**
 * Param schema — the serialized contract that lives alongside an IR template
 * and defines what URL params a renderer must accept.
 *
 * Storable as JSON in the database; compiles to a Zod schema at render time
 * via `paramsSchemaToZod`.
 */

import { z } from "zod";

export type ParamSchemaEntry =
  | { kind: "string"; default?: string; maxLen?: number; minLen?: number }
  | { kind: "number"; default?: number; min?: number; max?: number; integer?: boolean }
  | { kind: "boolean"; default?: boolean }
  | { kind: "enum"; values: [string, ...string[]]; default?: string }
  | { kind: "url"; default?: string; allowedHosts?: string[] }
  | { kind: "color"; default?: string };

export type ParamsSchema = Record<string, ParamSchemaEntry>;

const ParamSchemaEntryZ = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("string"),
    default: z.string().optional(),
    maxLen: z.number().int().positive().optional(),
    minLen: z.number().int().nonnegative().optional(),
  }),
  z.object({
    kind: z.literal("number"),
    default: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    integer: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("boolean"),
    default: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal("enum"),
    values: z.array(z.string()).nonempty(),
    default: z.string().optional(),
  }),
  z.object({
    kind: z.literal("url"),
    default: z.string().optional(),
    allowedHosts: z.array(z.string()).optional(),
  }),
  z.object({
    kind: z.literal("color"),
    default: z.string().optional(),
  }),
]);

export const ParamsSchemaZ = z.record(z.string(), ParamSchemaEntryZ);

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB = /^rgba?\([^)]+\)$/i;
const HSL = /^hsla?\([^)]+\)$/i;

const isColor = (s: string) => HEX.test(s) || RGB.test(s) || HSL.test(s);

const compileEntry = (entry: ParamSchemaEntry): z.ZodTypeAny => {
  switch (entry.kind) {
    case "string": {
      let s = z.string();
      if (entry.minLen !== undefined) s = s.min(entry.minLen);
      if (entry.maxLen !== undefined) s = s.max(entry.maxLen);
      return entry.default !== undefined ? s.default(entry.default) : s;
    }
    case "number": {
      let n = z.coerce.number();
      if (entry.integer) n = n.int();
      if (entry.min !== undefined) n = n.min(entry.min);
      if (entry.max !== undefined) n = n.max(entry.max);
      return entry.default !== undefined ? n.default(entry.default) : n;
    }
    case "boolean": {
      const b = z
        .union([z.boolean(), z.enum(["true", "false", "1", "0"])])
        .transform((v) => v === true || v === "true" || v === "1");
      return entry.default !== undefined ? b.default(entry.default) : b;
    }
    case "enum": {
      const e = z.enum(entry.values);
      return entry.default !== undefined ? e.default(entry.default) : e;
    }
    case "url": {
      const base = z.string().url();
      const u: z.ZodTypeAny =
        entry.allowedHosts && entry.allowedHosts.length > 0
          ? base.refine(
              (raw) => {
                try {
                  const host = new URL(raw).hostname.toLowerCase();
                  return entry.allowedHosts!.some(
                    (h) =>
                      host === h.toLowerCase() ||
                      host.endsWith("." + h.toLowerCase()),
                  );
                } catch {
                  return false;
                }
              },
              { message: "host not allowed" },
            )
          : base;
      return entry.default !== undefined ? u.default(entry.default) : u;
    }
    case "color": {
      const c = z.string().refine(isColor, { message: "not a valid color" });
      return entry.default !== undefined ? c.default(entry.default) : c;
    }
  }
};

/**
 * Compile a serialized ParamsSchema into a Zod object schema usable for
 * validating URL search params.
 */
export const paramsSchemaToZod = (schema: ParamsSchema) => {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, entry] of Object.entries(schema)) {
    shape[key] = compileEntry(entry);
  }
  return z.object(shape);
};

/**
 * Parse URLSearchParams into a plain object, handling the fact that values
 * are always strings. Repeated keys produce an array; otherwise a scalar.
 */
export const searchParamsToObject = (sp: URLSearchParams): Record<string, unknown> => {
  const obj: Record<string, unknown> = {};
  for (const key of new Set(sp.keys())) {
    const all = sp.getAll(key);
    obj[key] = all.length > 1 ? all : all[0];
  }
  return obj;
};
