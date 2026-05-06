import type { Node, ParamsSchema } from "@waku/ir";

import * as bigTitle from "./big-title";
import * as gradient from "./gradient";
import * as quote from "./quote";
import * as repo from "./repo";
import * as split from "./split";

export type SystemTemplate = {
  slug: string;
  version: number;
  name: string;
  ir: Node;
  params: ParamsSchema;
};

const TEMPLATE_NAMES: Record<string, string> = {
  "big-title": "Big title",
  gradient: "Gradient",
  quote: "Quote",
  repo: "Repo card",
  split: "Split",
};

const modules = [bigTitle, gradient, quote, repo, split];

export const systemTemplates: SystemTemplate[] = modules.map((m) => ({
  slug: m.slug,
  version: m.version,
  name: TEMPLATE_NAMES[m.slug] ?? m.slug,
  ir: m.ir,
  params: m.params,
}));

export const getSystemTemplate = (
  slug: string,
  version: number,
): SystemTemplate | null =>
  systemTemplates.find((t) => t.slug === slug && t.version === version) ?? null;
