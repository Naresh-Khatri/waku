import { groq } from "@ai-sdk/groq";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { and, eq } from "drizzle-orm";
import { chatConversation, chatMessage } from "@waku/db";

import {
  AI_TEMPLATE_EXAMPLES,
  AI_TEMPLATE_SYSTEM_PROMPT,
} from "@/components/template-editor/ai-prompt";
import type { TemplateDocument } from "@/components/template-editor/types";
import { env } from "@/env";
import { proposeDesignTool } from "@/server/ai/design-tool";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";

/**
 * Drop fields whose value equals the editor's implicit default. The example
 * literals stay strict TemplateDocuments (validator script keeps working) but
 * the JSON the LLM sees is ~40% smaller — less TPM, same information.
 */
function stripExampleDefaults(doc: TemplateDocument): unknown {
  const stripNode = (n: TemplateDocument["nodes"][number]) => {
    const out: Record<string, unknown> = { ...n };
    if (out.parentId === null || out.parentId === undefined) delete out.parentId;
    if (out.rotation === 0) delete out.rotation;
    if (out.opacity === 1) delete out.opacity;
    if (out.visible === true) delete out.visible;
    if (out.locked === false) delete out.locked;
    // shadow is required-nullable on image, optional everywhere else.
    if (n.type !== "image" && out.shadow === null) delete out.shadow;
    return out;
  };
  return {
    artboard: doc.artboard,
    nodes: doc.nodes.map(stripNode),
    paramsSchema: doc.paramsSchema,
  };
}

const WORKED_EXAMPLES = AI_TEMPLATE_EXAMPLES.map(
  (doc, i) =>
    `Example ${i + 1} (defaults like parentId:null, rotation:0, opacity:1, visible:true, locked:false omitted):\n${JSON.stringify(stripExampleDefaults(doc), null, 2)}`,
).join("\n\n");

const SYSTEM_PROMPT = `You design Open Graph images (default 1200×630) for an editor chat. Call \`propose_design\` 2–3 times per user message. Each call MUST commit to a fundamentally different visual idea — different palette, different composition, different scale of headline, different role for shapes. NEVER ship minor recolors of the same layout.

The tool takes two arguments:
  - name: short label describing the VISUAL DIRECTION ("Bold on dark", "Off-canvas pop", "Brutalist headline") — not the user's topic.
  - document: a full TemplateDocument matching the shape below.

${AI_TEMPLATE_SYSTEM_PROMPT}

# Worked examples (full TemplateDocument JSON)

${WORKED_EXAMPLES}

# Variation directives (chat mode)

- Hard rules:
  - DO NOT add a full-bleed rectangle in the same color as artboard.background. Put the color on artboard.background.
  - Every shape must serve a purpose (accent, card, underline, badge, off-canvas bleed). No orphan decoration squares.
  - Text contrast: ≥4.5:1 against whatever sits directly behind it.
  - Bounding box must fit the text: width ≥ 0.55 × text.length × fontSize, height ≥ fontSize × lineHeight.
  - Headlines: 72–140px, weight 700+. Eyebrows/captions: 20–32px, weight 500–600.
  - Use 4–8 nodes per design.
- Across the 2–3 proposals, vary palette (dark/light/saturated), composition (centered / split / asymmetric), headline scale, and the role shapes play. Use gradients, off-canvas bleeds, sidebars, badges, paths, etc. — not just rectangles and ellipses.
- Use the font catalogue intentionally (display fonts for posters, serifs for editorial, mono for code/data, sans for body).

After the tool calls, write ONE line (under 25 words) on what makes the variations different. Don't restate the user's prompt.

If the user asks a non-design question, answer briefly without calling the tool.`;

function deriveTitle(messages: UIMessage[]): string {
  for (const m of messages) {
    if (m.role !== "user") continue;
    for (const part of m.parts) {
      if (part.type === "text" && part.text.trim()) {
        return part.text.trim().slice(0, 80);
      }
    }
  }
  return "New chat";
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!env.GROQ_API_KEY) {
    return new Response("AI is not configured (GROQ_API_KEY missing)", {
      status: 503,
    });
  }

  const {
    messages,
    conversationId: incomingId,
  }: { messages: UIMessage[]; conversationId?: string } = await req.json();

  const userId = session.user.id;

  let conversationId: string | null = null;
  if (incomingId) {
    const existing = await db.query.chatConversation.findFirst({
      where: and(
        eq(chatConversation.id, incomingId),
        eq(chatConversation.userId, userId),
      ),
      columns: { id: true },
    });
    if (existing) conversationId = existing.id;
  }
  if (!conversationId) {
    const [created] = await db
      .insert(chatConversation)
      .values({ userId, title: deriveTitle(messages) })
      .returning({ id: chatConversation.id });
    if (!created) {
      return new Response("Failed to create conversation", { status: 500 });
    }
    conversationId = created.id;
  }

  const cid = conversationId;

  // Persist any user/tool messages we haven't seen yet (deduped by id).
  if (messages.length > 0) {
    await db
      .insert(chatMessage)
      .values(
        messages
          .filter((m) => m.id)
          .map((m) => ({
            id: m.id,
            conversationId: cid,
            role: m.role,
            parts: m.parts as unknown[],
          })),
      )
      .onConflictDoNothing({ target: chatMessage.id });
  }

  // Send only the latest user turn to the model. Each design call is
  // effectively a fresh request — the system prompt already steers style and
  // variation, and re-shipping prior tool outputs (full TemplateDocument JSON)
  // would blow past Groq's TPM cap within a couple of turns. UI history is
  // preserved via DB persistence above.
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const llmMessages = lastUser ? [lastUser] : messages;

  const result = streamText({
    model: groq(env.GROQ_MODEL),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(llmMessages),
    tools: { propose_design: proposeDesignTool },
    stopWhen: stepCountIs(6),
  });

  return result.toUIMessageStreamResponse({
    headers: { "x-conversation-id": cid },
    originalMessages: messages,
    generateMessageId: () => crypto.randomUUID(),
    onFinish: async ({ responseMessage }) => {
      if (!responseMessage.id) return;
      await db
        .insert(chatMessage)
        .values({
          id: responseMessage.id,
          conversationId: cid,
          role: responseMessage.role,
          parts: responseMessage.parts as unknown[],
        })
        .onConflictDoNothing({ target: chatMessage.id });
      await db
        .update(chatConversation)
        .set({ updatedAt: new Date() })
        .where(eq(chatConversation.id, cid));
    },
  });
}
