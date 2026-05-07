import { TRPCError } from "@trpc/server";
import { wakuTemplate, wakuTemplateVersion } from "@waku/db";
import { systemTemplates, getSystemTemplate } from "@waku/templates";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { emptyTemplateDocument } from "@/components/template-editor/schema";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";

const archetypes: Record<string, string> = {
  "big-title": "marketing",
  gradient: "vibe",
  quote: "social",
  repo: "open-source",
  split: "marketing",
};

const tags: Record<string, string[]> = {
  "big-title": ["bold", "launch", "blog"],
  gradient: ["minimal", "abstract", "quote"],
  quote: ["testimonial", "social"],
  repo: ["github", "open-source", "card"],
  split: ["product", "marketing"],
};

export const marketplaceRouter = createTRPCRouter({
  list: publicProcedure.query(() => {
    return systemTemplates.map((t) => ({
      slug: t.slug,
      name: t.name,
      archetype: archetypes[t.slug] ?? "general",
      tags: tags[t.slug] ?? [],
      paramCount: Object.keys(t.params).length,
      version: t.version,
      featured: true,
    }));
  }),

  get: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(({ input }) => {
      const tpl = systemTemplates.find((t) => t.slug === input.slug);
      if (!tpl) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        slug: tpl.slug,
        name: tpl.name,
        archetype: archetypes[tpl.slug] ?? "general",
        tags: tags[tpl.slug] ?? [],
        version: tpl.version,
      };
    }),

  fork: protectedProcedure
    .input(
      z.object({
        slug: z.string(),
        targetSlug: z
          .string()
          .min(1)
          .max(64)
          .regex(/^[a-z0-9][a-z0-9-]*$/)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tpl = getSystemTemplate(input.slug, 1);
      if (!tpl) throw new TRPCError({ code: "NOT_FOUND" });

      const userId = ctx.session.user.id;
      let baseSlug = input.targetSlug ?? tpl.slug;
      // if target slug already exists for this user, append "-fork-N"
      const existing = await ctx.db
        .select({ slug: wakuTemplate.slug })
        .from(wakuTemplate)
        .where(
          and(
            eq(wakuTemplate.userId, userId),
            sql`${wakuTemplate.slug} LIKE ${baseSlug + "%"}`,
          ),
        );
      if (existing.some((r) => r.slug === baseSlug)) {
        let n = 2;
        while (existing.some((r) => r.slug === `${baseSlug}-${n}`)) n += 1;
        baseSlug = `${baseSlug}-${n}`;
      }

      return ctx.db.transaction(async (tx) => {
        const [newTpl] = await tx
          .insert(wakuTemplate)
          .values({
            userId,
            slug: baseSlug,
            name: `${tpl.name} (forked)`,
          })
          .returning();
        if (!newTpl) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [version] = await tx
          .insert(wakuTemplateVersion)
          .values({
            templateId: newTpl.id,
            version: 1,
            documentJson: emptyTemplateDocument(),
          })
          .returning();
        return { template: newTpl, version };
      });
    }),
});
