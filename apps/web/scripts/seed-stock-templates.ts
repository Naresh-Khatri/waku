// Seeds `template_category` and `stock_template` from
// packages/db/seeds/stock-templates.json. Idempotent: rerunning upserts by
// slug. Run with:
//
//   pnpm --filter @waku/web db:seed-stock-templates
//
// Requires DATABASE_URL. Picks up SEED_USER_ID for `stock_template.createdBy`
// if set; otherwise falls back to the first admin (`user.isAdmin = true`).

import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import {
  createDb,
  stockTemplate,
  templateCategory,
  user,
  type TemplateDocumentRow,
} from "@waku/db";

import { TemplateDocumentZ } from "../src/components/template-editor/schema";

type RawNode = Record<string, unknown> & { type: string };

interface RawTemplate {
  slug: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  document: {
    artboard: unknown;
    nodes: RawNode[];
    paramsSchema: unknown;
  };
}

interface SeedFile {
  categories: { slug: string; name: string; sortOrder: number }[];
  templates: RawTemplate[];
}

function normalizeNode(node: RawNode): RawNode {
  const out: RawNode = {
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    parentId: null,
    ...node,
  };
  if (out.type === "text" && out.italic === undefined) out.italic = false;
  if (out.type === "line" && out.arrow === undefined) out.arrow = false;
  if (out.type === "image" && out.shadow === undefined) out.shadow = null;
  return out;
}

function normalizeDocument(doc: RawTemplate["document"]): TemplateDocumentRow {
  const normalized = {
    artboard: doc.artboard,
    nodes: doc.nodes.map(normalizeNode),
    paramsSchema: doc.paramsSchema,
  };
  const parsed = TemplateDocumentZ.safeParse(normalized);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.join(".") || "(root)";
    const why = issue?.message ?? "unknown";
    throw new Error(`validation failed at ${where}: ${why}`);
  }
  return parsed.data as TemplateDocumentRow;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const seedPath = new URL(
    "../../../packages/db/seeds/stock-templates.json",
    import.meta.url,
  );
  const raw = JSON.parse(readFileSync(seedPath, "utf8")) as SeedFile;

  const { db, conn } = createDb(url);
  try {
    // Resolve the creator user up front — every stock_template row needs one.
    let createdBy = process.env.SEED_USER_ID;
    if (!createdBy) {
      const admin = await db.query.user.findFirst({
        where: eq(user.isAdmin, true),
      });
      createdBy = admin?.id;
    }
    if (!createdBy) {
      throw new Error(
        "No creator user found. Set SEED_USER_ID=<userId>, or mark a user as admin first.",
      );
    }

    console.log(`Seeding as user: ${createdBy}`);

    // Upsert categories, then build slug → id map.
    for (const c of raw.categories) {
      await db
        .insert(templateCategory)
        .values({ slug: c.slug, name: c.name, sortOrder: c.sortOrder })
        .onConflictDoUpdate({
          target: templateCategory.slug,
          set: { name: c.name, sortOrder: c.sortOrder },
        });
    }
    const allCategories = await db.query.templateCategory.findMany();
    const categoryIdBySlug = new Map(allCategories.map((c) => [c.slug, c.id]));
    console.log(`Upserted ${raw.categories.length} categories`);

    // Upsert templates.
    const now = new Date();
    for (const t of raw.templates) {
      const categoryId = categoryIdBySlug.get(t.category);
      if (!categoryId) {
        throw new Error(`Unknown category "${t.category}" on "${t.slug}"`);
      }
      let documentJson: TemplateDocumentRow;
      try {
        documentJson = normalizeDocument(t.document);
      } catch (err) {
        throw new Error(`[${t.slug}] ${(err as Error).message}`);
      }
      await db
        .insert(stockTemplate)
        .values({
          slug: t.slug,
          name: t.name,
          description: t.description,
          categoryId,
          tags: t.tags,
          documentJson,
          createdBy,
          publishedAt: now,
        })
        .onConflictDoUpdate({
          target: stockTemplate.slug,
          set: {
            name: t.name,
            description: t.description,
            categoryId,
            tags: t.tags,
            documentJson,
            updatedAt: now,
          },
        });
      console.log(`  ✓ ${t.slug}`);
    }
    console.log(`Upserted ${raw.templates.length} stock templates`);
  } finally {
    await conn.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
