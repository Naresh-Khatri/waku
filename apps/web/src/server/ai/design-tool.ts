import { tool } from "ai";
import { z } from "zod";

import { TemplateDocumentZ } from "@/components/template-editor/schema";
import type { TemplateDocument } from "@/components/template-editor/types";

/**
 * `document` is intentionally typed loose (`Record<string, any>`) on the tool
 * input. The AI SDK serializes Zod schemas into the JSON Schema sent to the
 * model on every request — a full `TemplateDocumentZ` (8-way discriminated
 * union + Paint variants + ParamRef variants + ParamSchemaEntry + Shadow…)
 * produces ~8k tokens of schema and tips the request over Groq's TPM cap.
 *
 * The model is steered by the rich system-prompt spec + worked examples, and
 * we revalidate against `TemplateDocumentZ` inside `execute()` so the persisted
 * output still conforms to the strict shape.
 */
export const DesignInputZ = z.object({
  name: z
    .string()
    .describe(
      'short label for the visual direction ("Bold on dark", "Off-canvas pop", "Brutalist headline") — not the user\'s topic. Max 60 chars.',
    ),
  document: z
    .record(z.string(), z.any())
    .describe(
      "full TemplateDocument JSON object — artboard, nodes[], paramsSchema. Shape and field rules are in the system prompt.",
    ),
});

export type DesignInput = z.infer<typeof DesignInputZ>;

/**
 * The worked examples in the system prompt omit defaults (parentId, rotation,
 * opacity, visible, locked, shadow:null) to save tokens, so the model copies
 * that style and emits documents missing those fields. `TemplateDocumentZ` is
 * strict, so we re-hydrate the defaults here before validating instead of
 * loosening the schema for the entire editor.
 */
function fillNodeDefaults(doc: Record<string, unknown>): Record<string, unknown> {
  const nodes = Array.isArray(doc.nodes) ? doc.nodes : [];
  const filledNodes = nodes.map((raw) => {
    if (!raw || typeof raw !== "object") return raw;
    const n = raw as Record<string, unknown>;
    const out: Record<string, unknown> = { ...n };
    if (out.parentId === undefined) out.parentId = null;
    if (out.rotation === undefined) out.rotation = 0;
    if (out.opacity === undefined) out.opacity = 1;
    if (out.visible === undefined) out.visible = true;
    if (out.locked === undefined) out.locked = false;
    // image requires shadow as Shadow|null; other shadow-bearing types treat
    // shadow as optional, so leaving them undefined is fine.
    if (out.type === "image" && out.shadow === undefined) out.shadow = null;
    // LLMs frequently emit `null` for numeric fields when they mean "zero"
    // (no rounding, no border, no extra spacing). Coerce those rather than
    // bouncing the whole design back with a validation error.
    for (const key of ["cornerRadius", "strokeWidth", "letterSpacing"]) {
      if (out[key] === null) out[key] = 0;
    }
    return out;
  });
  return { ...doc, nodes: filledNodes };
}

export const proposeDesignTool = tool({
  description:
    "Propose one complete design as a full TemplateDocument. Call 2–3 times per user request with visually distinct variations.",
  inputSchema: DesignInputZ,
  execute: async (input) => {
    const hydrated = fillNodeDefaults(input.document);
    const parsed = TemplateDocumentZ.safeParse(hydrated);
    if (!parsed.success) {
      // Surface the validation error to the model so it can retry. The AI SDK
      // forwards thrown errors back as a tool error part the LLM can see.
      const issue = parsed.error.issues[0];
      const path = issue?.path.join(".") || "(root)";
      throw new Error(
        `Invalid TemplateDocument at ${path}: ${issue?.message ?? "unknown"}. Re-emit propose_design with a valid document.`,
      );
    }
    return {
      name: input.name.trim().slice(0, 120) || "Design",
      document: parsed.data,
    };
  },
});

export type ProposeDesignOutput = {
  name: string;
  document: TemplateDocument;
};
