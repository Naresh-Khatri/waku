import { groq } from "@ai-sdk/groq";
import {
  convertToModelMessages,
  NoSuchToolError,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { and, eq } from "drizzle-orm";
import { chatConversation, chatMessage } from "@waku/db";

import { AI_TEMPLATE_SYSTEM_PROMPT } from "@/components/template-editor/ai-prompt";
import { env } from "@/env";
import { proposeDesignTool } from "@/server/ai/design-tool";
import {
  makeReadStockTemplateTool,
  makeSearchStockTemplatesTool,
} from "@/server/ai/stock-tools";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";

const SYSTEM_PROMPT = `You curate Open Graph image designs (default 1200×630) by adapting a library of vetted stock templates. You do NOT design from scratch.

# Workflow (every design request)

1. Call \`search_stock_templates\` once or twice to discover candidates. Use the user's prompt to derive the query terms; pick a category slug only if you're confident. Known categories: blog-post, product-launch, changelog, quote, event, podcast, course, job-posting, case-study, newsletter.
2. Pick exactly 3 candidates that are visually distinct from each other (different palette, composition, headline scale, role of shapes). If your first search returns near-duplicates, search again with broader terms.
3. For each pick, call \`read_stock_template\` to load the full TemplateDocument.
4. For each loaded template, call \`propose_design\` once with:
   - name: a short label for THIS variation ("Bold on dark", "Editorial serif", "Brutalist headline") — not the user's topic.
   - basedOnStock: the slug you loaded.
   - document: the loaded document, customized to fit the user's prompt.
5. After all three \`propose_design\` calls, write ONE line (under 25 words) explaining what makes the variations different. Don't restate the prompt.

# Customizing a stock template

You may freely edit anything on the loaded document — replace headline/body copy, retitle, swap palette and fonts, move/resize/add/remove nodes, change artboard background. The goal is to feel tailored to the user's brief, not pasted from stock.

Customization rules:
- Replace placeholder copy with copy that fits the user's prompt. Never leave "Lorem ipsum" or generic stock text.
- Keep node ids unique within a document; reuse the ids from the stock doc where possible.
- Bounding box must fit the text: width ≥ 0.55 × text.length × fontSize, height ≥ fontSize × lineHeight.
- Headlines: 72–140px, weight 700+. Eyebrows/captions: 20–32px, weight 500–600.
- Text contrast ≥4.5:1 against whatever sits directly behind it.
- Do NOT add a full-bleed rectangle in the same color as artboard.background. Put the color on artboard.background.
- The output document must still validate against the TemplateDocument schema below.

${AI_TEMPLATE_SYSTEM_PROMPT}

# Off-topic

If the user asks a non-design question, answer briefly and do not call any tool.`;

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
    tools: {
      search_stock_templates: makeSearchStockTemplatesTool(db),
      read_stock_template: makeReadStockTemplateTool(db),
      propose_design: proposeDesignTool,
    },
    stopWhen: stepCountIs(14),
    // Smaller Groq models (e.g. llama-3.3-70b-versatile) occasionally serialize
    // a tool call as `{ toolName: "search_stock_templates {\"query\":...}", input: "" }` —
    // function name and JSON args glued together. Groq's next-step validation
    // rejects this with "tool '<name> {...}' not in request.tools" because the
    // assistant message is round-tripped back. Detect the glued form and split it.
    experimental_repairToolCall: async ({ toolCall, tools, error }) => {
      if (!NoSuchToolError.isInstance(error)) return null;
      const raw = toolCall.toolName;
      const brace = raw.indexOf("{");
      if (brace <= 0) return null;
      const candidateName = raw.slice(0, brace).trim();
      if (!(candidateName in tools)) return null;
      const argsText = raw.slice(brace).trim();
      try {
        JSON.parse(argsText);
      } catch {
        return null;
      }
      return {
        type: "tool-call",
        toolCallId: toolCall.toolCallId,
        toolName: candidateName,
        input: toolCall.input && toolCall.input !== "" ? toolCall.input : argsText,
      };
    },
  });

  return result.toUIMessageStreamResponse({
    headers: { "x-conversation-id": cid },
    originalMessages: messages,
    generateMessageId: () => crypto.randomUUID(),
    onError: (err) => {
      console.error("[chat] stream error", err);
      return "Something went wrong. Please try again.";
    },
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
