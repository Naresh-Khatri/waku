import { groq } from "@ai-sdk/groq";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { and, eq } from "drizzle-orm";
import { chatConversation, chatMessage } from "@waku/db";

import { env } from "@/env";
import { proposeDesignTool } from "@/server/ai/design-tool";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";

const SYSTEM_PROMPT = `You design Open Graph images (1200×630). Call \`propose_design\` 2–3 times. Each call MUST commit to a fundamentally different visual idea — different palette, different composition, different scale of headline, different role for shapes. NEVER ship 3 minor recolors of the same layout.

Schema:
- artboard: { width: 1200, height: 630, background: "#rrggbb" }
- nodes[]: each has type, id, x, y, width, height.
  - type="text": + text, fontSize, fontWeight (400–800), color, align ("left"|"center"|"right")
  - type="rectangle": + fill. optional cornerRadius
  - type="ellipse": + fill

Hard rules:
- DON'T add a full-bleed rectangle in the same color as artboard.background. Use the bg field for that.
- DON'T drop random shapes for "decoration" — every shape must serve a purpose (accent, card, underline, badge, off-canvas bleed).
- Text contrast: ≥4.5:1 against whatever sits directly behind it.
- Bounding box must fit the text: width ≥ 0.55 × text.length × fontSize, height ≥ fontSize × 1.2.
- Headlines: 72–140px, weight 700 or 800. Eyebrows/captions: 20–32px, weight 500–600.
- Use 4–8 nodes. Empty designs are bad. So are random orphan squares.
- The \`name\` field describes the VISUAL DIRECTION ("Bold on dark", "Off-canvas pop", "Brutalist headline") — not the user's topic.

Three worked examples for prompt "OG for a Postgres performance blog post" — note how different they look from each other:

EXAMPLE 1 — Bold on dark with off-canvas accent:
{
  "name": "Off-canvas pop",
  "artboard": { "width": 1200, "height": 630, "background": "#0f172a" },
  "nodes": [
    { "type": "ellipse", "id": "blob", "x": -200, "y": -200, "width": 600, "height": 600, "fill": "#7c5cff" },
    { "type": "rectangle", "id": "underline", "x": 80, "y": 480, "width": 140, "height": 6, "fill": "#a78bfa" },
    { "type": "text", "id": "eyebrow", "x": 80, "y": 200, "width": 600, "height": 32, "text": "POSTGRES PERFORMANCE", "fontSize": 22, "fontWeight": 600, "color": "#a78bfa", "align": "left" },
    { "type": "text", "id": "head", "x": 80, "y": 250, "width": 1040, "height": 220, "text": "Faster queries in 5 minutes", "fontSize": 104, "fontWeight": 800, "color": "#ffffff", "align": "left" },
    { "type": "text", "id": "sub", "x": 80, "y": 520, "width": 800, "height": 40, "text": "Index tuning that actually moves the needle.", "fontSize": 26, "fontWeight": 500, "color": "#94a3b8", "align": "left" }
  ]
}

EXAMPLE 2 — Editorial split with colored sidebar:
{
  "name": "Editorial split",
  "artboard": { "width": 1200, "height": 630, "background": "#f8fafc" },
  "nodes": [
    { "type": "rectangle", "id": "side", "x": 0, "y": 0, "width": 360, "height": 630, "fill": "#0f172a" },
    { "type": "ellipse", "id": "dot", "x": 240, "y": 80, "width": 56, "height": 56, "fill": "#f97316" },
    { "type": "text", "id": "issue", "x": 60, "y": 540, "width": 240, "height": 28, "text": "ISSUE 014", "fontSize": 20, "fontWeight": 600, "color": "#94a3b8", "align": "left" },
    { "type": "text", "id": "head", "x": 420, "y": 180, "width": 720, "height": 280, "text": "Index tuning, demystified.", "fontSize": 88, "fontWeight": 700, "color": "#0f172a", "align": "left" },
    { "type": "text", "id": "byline", "x": 420, "y": 500, "width": 720, "height": 32, "text": "By @waku-blog · 8 min read", "fontSize": 24, "fontWeight": 500, "color": "#475569", "align": "left" }
  ]
}

EXAMPLE 3 — Brutalist solid color with massive headline:
{
  "name": "Brutalist headline",
  "artboard": { "width": 1200, "height": 630, "background": "#facc15" },
  "nodes": [
    { "type": "rectangle", "id": "tag", "x": 80, "y": 80, "width": 220, "height": 48, "fill": "#0a0a0a", "cornerRadius": 24 },
    { "type": "text", "id": "tagText", "x": 80, "y": 88, "width": 220, "height": 32, "text": "POSTGRES", "fontSize": 18, "fontWeight": 700, "color": "#facc15", "align": "center" },
    { "type": "text", "id": "head", "x": 80, "y": 180, "width": 1040, "height": 360, "text": "QUERIES THAT FLY.", "fontSize": 168, "fontWeight": 800, "color": "#0a0a0a", "align": "left" },
    { "type": "text", "id": "sub", "x": 80, "y": 540, "width": 800, "height": 32, "text": "A field guide to making Postgres scream.", "fontSize": 22, "fontWeight": 500, "color": "#0a0a0a", "align": "left" }
  ]
}

Notice: completely different palettes (dark/light/yellow), different compositions (centered-ish/split-screen/asymmetric), different scales (104/88/168px headlines), different shape roles (off-canvas blob/full-height sidebar/badge pill).

Apply this same level of variation to whatever topic the user asks about.

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

  const result = streamText({
    model: groq(env.GROQ_MODEL),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
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
