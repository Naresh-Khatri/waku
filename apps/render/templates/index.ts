import { systemTemplates, type SystemTemplate } from "@waku/templates";

export type Template = SystemTemplate;

const TEMPLATES: Record<string, Record<number, Template>> = (() => {
  const out: Record<string, Record<number, Template>> = {};
  for (const t of systemTemplates) {
    out[t.slug] ??= {};
    out[t.slug]![t.version] = t;
  }
  return out;
})();

export const getTemplate = (slug: string, version: number): Template | null =>
  TEMPLATES[slug]?.[version] ?? null;

export const listTemplates = (): Template[] =>
  Object.values(TEMPLATES).flatMap((v) => Object.values(v));
