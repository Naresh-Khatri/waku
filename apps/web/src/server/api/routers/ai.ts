import { TRPCError } from "@trpc/server";
import { wakuAiGeneration } from "@waku/db";
import {
  ParamsSchemaZ,
  TemplateIRSchema,
  paramsSchemaToZod,
  type Node,
} from "@waku/ir";
import { systemTemplates, getSystemTemplate } from "@waku/templates";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { aiMode, callAnthropic, extractJson } from "@/server/ai/client";
import {
  buildPickTemplateSystem,
  buildPickTemplateUser,
  buildRemixThemeSystem,
  buildGenerateCopySystem,
} from "@/server/ai/prompts/pick-template";
import {
  CREDIT_COSTS,
  chargeCredits,
  refundCredits,
} from "@/server/billing/credits";

const insufficient = (balance: number, needed: number) =>
  new TRPCError({
    code: "FORBIDDEN",
    message: `Insufficient credits. Need ${needed}, have ${balance}.`,
    cause: { kind: "insufficient_credits", balance, needed },
  });

async function logGeneration(
  userId: string,
  kind: string,
  prompt: string,
  inputJson: unknown,
  outputJson: unknown,
  creditsCharged: number,
  status: "success" | "failed",
  ms: number,
  error?: string,
) {
  const { db } = await import("@/server/db");
  const [row] = await db
    .insert(wakuAiGeneration)
    .values({
      userId,
      kind,
      prompt,
      inputJson,
      outputJson,
      creditsCharged,
      status,
      ms,
      error,
    })
    .returning({ id: wakuAiGeneration.id });
  return row?.id;
}

export const aiRouter = createTRPCRouter({
  mode: protectedProcedure.query(() => ({ mode: aiMode })),

  pickTemplate: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1).max(2000),
        contextText: z.string().max(8000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const cost = CREDIT_COSTS.pickTemplate;
      const charge = await chargeCredits(userId, cost, "ai.template_pick");
      if (!charge.ok) throw insufficient(charge.balance, charge.needed);

      const start = Date.now();
      try {
        let picked: { templateId: string; params: Record<string, unknown>; rationale: string };

        if (aiMode === "live") {
          const { text } = await callAnthropic({
            system: buildPickTemplateSystem(),
            messages: [
              {
                role: "user",
                content: buildPickTemplateUser({
                  prompt: input.prompt,
                  contextText: input.contextText,
                  templates: systemTemplates,
                }),
              },
            ],
            maxTokens: 1024,
            temperature: 0.3,
          });
          picked = extractJson<typeof picked>(text);
        } else {
          picked = stubPickTemplate(input.prompt);
        }

        const tpl = systemTemplates.find((t) => t.slug === picked.templateId);
        if (!tpl) throw new Error(`unknown templateId: ${picked.templateId}`);

        const zodSchema = paramsSchemaToZod(tpl.params);
        const parsed = zodSchema.safeParse(picked.params);
        if (!parsed.success) {
          // refund — our prompt didn't pin output strictly enough
          await refundCredits(userId, cost);
          throw new Error(`params validation failed: ${parsed.error.message}`);
        }

        const ms = Date.now() - start;
        const id = await logGeneration(
          userId,
          "ai.template_pick",
          input.prompt,
          { contextText: input.contextText ?? null },
          { ...picked, params: parsed.data },
          cost,
          "success",
          ms,
        );

        return {
          id,
          templateSlug: tpl.slug,
          templateName: tpl.name,
          ir: tpl.ir,
          params: tpl.params,
          values: parsed.data,
          rationale: picked.rationale,
          balanceAfter: charge.balanceAfter,
        };
      } catch (err) {
        const ms = Date.now() - start;
        const message = err instanceof Error ? err.message : String(err);
        await logGeneration(
          userId,
          "ai.template_pick",
          input.prompt,
          { contextText: input.contextText ?? null },
          null,
          cost,
          "failed",
          ms,
          message,
        );
        // refund non-validation upstream errors too — user gets nothing usable
        await refundCredits(userId, cost).catch((e) => { console.error("refund failed", e); });
        throw err instanceof TRPCError
          ? err
          : new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),

  remixTheme: protectedProcedure
    .input(
      z.object({
        ir: TemplateIRSchema,
        paramsSchema: ParamsSchemaZ,
        direction: z.string().max(120).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const cost = CREDIT_COSTS.remixTheme;
      const charge = await chargeCredits(userId, cost, "ai.theme_remix");
      if (!charge.ok) throw insufficient(charge.balance, charge.needed);

      const start = Date.now();
      try {
        let remix: { ir: Node; summary: string };

        if (aiMode === "live") {
          const { text } = await callAnthropic({
            system: buildRemixThemeSystem(),
            messages: [
              {
                role: "user",
                content: [
                  `Direction: ${input.direction ?? "surprise me — pick a fresh palette"}.`,
                  `Current IR:`,
                  JSON.stringify(input.ir),
                ].join("\n"),
              },
            ],
            maxTokens: 4096,
            temperature: 0.6,
          });
          remix = extractJson<typeof remix>(text);
        } else {
          remix = {
            ir: stubRemix(input.ir as Node),
            summary: "Stub palette swap",
          };
        }

        const parsed = TemplateIRSchema.safeParse(remix.ir);
        if (!parsed.success) {
          await refundCredits(userId, cost);
          throw new Error(`remix returned invalid IR: ${parsed.error.message}`);
        }

        const ms = Date.now() - start;
        await logGeneration(
          userId,
          "ai.theme_remix",
          input.direction ?? "(surprise)",
          { paramsSchema: input.paramsSchema },
          { summary: remix.summary },
          cost,
          "success",
          ms,
        );

        return {
          ir: parsed.data as Node,
          summary: remix.summary,
          balanceAfter: charge.balanceAfter,
        };
      } catch (err) {
        const ms = Date.now() - start;
        const message = err instanceof Error ? err.message : String(err);
        await logGeneration(
          userId,
          "ai.theme_remix",
          input.direction ?? "(surprise)",
          {},
          null,
          cost,
          "failed",
          ms,
          message,
        );
        await refundCredits(userId, cost).catch((e) => { console.error("refund failed", e); });
        throw err instanceof TRPCError
          ? err
          : new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),

  generateCopy: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1).max(2000),
        fields: z
          .array(z.enum(["title", "subtitle", "tagline"]))
          .min(1)
          .default(["title"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const cost = CREDIT_COSTS.generateCopy;
      const charge = await chargeCredits(userId, cost, "ai.copy");
      if (!charge.ok) throw insufficient(charge.balance, charge.needed);

      const start = Date.now();
      try {
        let copy: Record<string, string>;
        if (aiMode === "live") {
          const { text } = await callAnthropic({
            system: buildGenerateCopySystem(),
            messages: [
              {
                role: "user",
                content: [
                  `Topic: ${input.prompt}`,
                  `Return JSON with these keys: ${input.fields.join(", ")}.`,
                ].join("\n"),
              },
            ],
            maxTokens: 256,
            temperature: 0.7,
          });
          copy = extractJson<Record<string, string>>(text);
        } else {
          copy = stubCopy(input.prompt, input.fields);
        }

        const ms = Date.now() - start;
        await logGeneration(
          userId,
          "ai.copy",
          input.prompt,
          { fields: input.fields },
          copy,
          cost,
          "success",
          ms,
        );
        return { copy, balanceAfter: charge.balanceAfter };
      } catch (err) {
        const ms = Date.now() - start;
        const message = err instanceof Error ? err.message : String(err);
        await logGeneration(
          userId,
          "ai.copy",
          input.prompt,
          { fields: input.fields },
          null,
          cost,
          "failed",
          ms,
          message,
        );
        await refundCredits(userId, cost).catch((e) => { console.error("refund failed", e); });
        throw err instanceof TRPCError
          ? err
          : new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),

  // Background image generation is deferred — needs FAL_KEY / Replicate. See docs/deferred.md.
  generateBackground: protectedProcedure
    .input(z.object({ prompt: z.string().min(1).max(500) }))
    .mutation(async () => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message:
          "Background image generation is not enabled in this build. See docs/deferred.md.",
      });
    }),
});

// ---------------- stubs ----------------

function stubPickTemplate(prompt: string): {
  templateId: string;
  params: Record<string, unknown>;
  rationale: string;
} {
  const p = prompt.toLowerCase();
  const slug = p.includes("quote")
    ? "quote"
    : p.includes("repo") || p.includes("github")
      ? "repo"
      : p.includes("gradient") || p.includes("vibe")
        ? "gradient"
        : p.includes("split") || p.includes("image")
          ? "split"
          : "big-title";
  const tpl = getSystemTemplate(slug, 1);
  if (!tpl) throw new Error("stub: template not found");
  const values: Record<string, unknown> = {};
  for (const [k, def] of Object.entries(tpl.params)) {
    const fallback = "default" in def ? def.default : undefined;
    if (fallback !== undefined) values[k] = fallback;
    else if (def.kind === "string") values[k] = prompt.slice(0, 60);
    else if (def.kind === "url")
      values[k] = "https://images.unsplash.com/photo-1503264116251-35a269479413";
    else if (def.kind === "color") values[k] = "#7c5cff";
    else if (def.kind === "number") values[k] = 0;
    else if (def.kind === "boolean") values[k] = true;
    else if (def.kind === "enum") values[k] = def.values[0];
  }
  if ("title" in tpl.params) values.title = prompt.slice(0, 60);
  return {
    templateId: slug,
    params: values,
    rationale: `(stub) selected ${slug} based on prompt keywords`,
  };
}

function stubRemix(ir: Node): Node {
  const palette = [
    "#7c5cff",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#0ea5e9",
    "#0B1020",
    "#FFFFFF",
  ];
  const pick = () => palette[Math.floor(Math.random() * palette.length)]!;
  const recurse = (n: Node): Node => {
    const next: Record<string, unknown> = { ...n };
    if ("bg" in next && typeof next.bg === "string") next.bg = pick();
    if ("color" in next && typeof next.color === "string") next.color = pick();
    if ("fill" in next && typeof next.fill === "string") next.fill = pick();
    if ("gradient" in next && next.gradient && typeof next.gradient === "object") {
      const g = next.gradient as { stops?: Array<{ color: string; offset: number }> };
      if (g.stops) g.stops = g.stops.map((s) => ({ ...s, color: pick() }));
    }
    if ("children" in next && Array.isArray(next.children)) {
      next.children = (next.children as Node[]).map(recurse);
    }
    return next as unknown as Node;
  };
  return recurse(ir);
}

function stubCopy(
  prompt: string,
  fields: Array<"title" | "subtitle" | "tagline">,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (fields.includes("title")) out.title = prompt.slice(0, 70);
  if (fields.includes("subtitle"))
    out.subtitle = `Stub subtitle for: ${prompt.slice(0, 80)}`;
  if (fields.includes("tagline")) out.tagline = `(stub) ${prompt.slice(0, 50)}`;
  return out;
}
