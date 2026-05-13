import { tool } from "ai";
import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { stockTemplate, templateCategory, type Db } from "@waku/db";

const SearchInputZ = z.object({
  query: z
    .string()
    .max(200)
    .optional()
    .describe(
      "free-text query matched against template name, description, and tags. Omit to browse a whole category.",
    ),
  category: z
    .string()
    .max(64)
    .optional()
    .describe(
      "optional category slug filter. Known slugs: blog-post, product-launch, changelog, quote, event, podcast, course, job-posting, case-study, newsletter.",
    ),
  limit: z.number().int().min(1).max(15).default(8),
});

const ReadInputZ = z.object({
  slug: z.string().min(1).max(120),
});

type ListRow = {
  slug: string;
  name: string;
  description: string | null;
  tags: string[];
  categorySlug: string | null;
  categoryName: string | null;
};

async function loadCatalogue(db: Db): Promise<ListRow[]> {
  const rows = await db
    .select({
      slug: stockTemplate.slug,
      name: stockTemplate.name,
      description: stockTemplate.description,
      tags: stockTemplate.tags,
      categorySlug: templateCategory.slug,
      categoryName: templateCategory.name,
    })
    .from(stockTemplate)
    .leftJoin(templateCategory, eq(templateCategory.id, stockTemplate.categoryId))
    .where(isNotNull(stockTemplate.publishedAt));
  return rows;
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
}

function scoreRow(row: ListRow, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  const name = row.name.toLowerCase();
  const desc = (row.description ?? "").toLowerCase();
  const tags = row.tags.map((t) => t.toLowerCase());
  let score = 0;
  for (const t of tokens) {
    if (name.includes(t)) score += 4;
    if (tags.some((tag) => tag.includes(t))) score += 3;
    if (desc.includes(t)) score += 1;
    if (row.categorySlug && row.categorySlug.includes(t)) score += 2;
  }
  return score;
}

export function makeSearchStockTemplatesTool(db: Db) {
  return tool({
    description:
      "Search the curated stock template catalogue. Returns lightweight rows (no document). Use this first to find 3 visually distinct candidates that fit the user's intent, then call read_stock_template to load each one.",
    inputSchema: SearchInputZ,
    execute: async ({ query, category, limit }) => {
      const all = await loadCatalogue(db);
      const filtered = category
        ? all.filter((r) => r.categorySlug === category)
        : all;
      const tokens = query ? tokenize(query) : [];
      const scored = filtered
        .map((r) => ({ r, score: scoreRow(r, tokens) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ r }) => ({
          slug: r.slug,
          name: r.name,
          description: r.description ?? "",
          category: r.categorySlug ?? null,
          tags: r.tags,
        }));
      return { results: scored };
    },
  });
}

export function makeReadStockTemplateTool(db: Db) {
  return tool({
    description:
      "Load the full TemplateDocument for one stock template by slug. Use the returned document as the starting point for propose_design — replace copy, swap palette/fonts, retitle, add/remove nodes as needed to fit the user's prompt. Always set propose_design.basedOnStock to this slug.",
    inputSchema: ReadInputZ,
    execute: async ({ slug }) => {
      const row = await db
        .select({
          slug: stockTemplate.slug,
          name: stockTemplate.name,
          description: stockTemplate.description,
          tags: stockTemplate.tags,
          documentJson: stockTemplate.documentJson,
          categorySlug: templateCategory.slug,
        })
        .from(stockTemplate)
        .leftJoin(
          templateCategory,
          eq(templateCategory.id, stockTemplate.categoryId),
        )
        .where(
          and(
            eq(stockTemplate.slug, slug),
            isNotNull(stockTemplate.publishedAt),
          ),
        )
        .limit(1);
      const r = row[0];
      if (!r) {
        throw new Error(
          `Unknown stock slug "${slug}". Call search_stock_templates first.`,
        );
      }
      return {
        slug: r.slug,
        name: r.name,
        description: r.description ?? "",
        tags: r.tags,
        category: r.categorySlug ?? null,
        document: r.documentJson,
      };
    },
  });
}
