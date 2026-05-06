import type { Node, ParamsSchema } from "@waku/ir";
import * as bigTitle from "./big-title";
import * as gradient from "./gradient";
import * as quote from "./quote";
import * as split from "./split";
import * as repo from "./repo";

export type Template = {
  slug: string;
  version: number;
  ir: Node;
  params: ParamsSchema;
};

const register = (mods: Array<{ slug: string; version: number; ir: Node; params: ParamsSchema }>) => {
  const out: Record<string, Record<number, Template>> = {};
  for (const m of mods) {
    out[m.slug] ??= {};
    out[m.slug]![m.version] = { slug: m.slug, version: m.version, ir: m.ir, params: m.params };
  }
  return out;
};

const TEMPLATES = register([bigTitle, gradient, quote, split, repo]);

export const getTemplate = (slug: string, version: number): Template | null => {
  return TEMPLATES[slug]?.[version] ?? null;
};

export const listTemplates = (): Template[] => {
  return Object.values(TEMPLATES).flatMap((v) => Object.values(v));
};
