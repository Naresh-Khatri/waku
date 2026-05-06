import "server-only";

/**
 * Anthropic client. If ANTHROPIC_API_KEY is set, calls the real API.
 * Otherwise runs in stub mode and returns deterministic fixtures so the
 * full UI/round-trip works locally without network or keys.
 */

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL_DEFAULT = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";

export const aiMode: "live" | "stub" = API_KEY ? "live" : "stub";

type Message = { role: "user" | "assistant"; content: string };

type CallOpts = {
  system?: string;
  messages: Message[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
};

type AnthropicMessageResp = {
  content: Array<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export async function callAnthropic(opts: CallOpts): Promise<{
  text: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}> {
  if (!API_KEY) {
    throw new Error("ANTHROPIC_API_KEY missing — caller should branch on aiMode");
  }
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model ?? MODEL_DEFAULT,
      system: opts.system,
      messages: opts.messages,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.4,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Anthropic ${resp.status}: ${text.slice(0, 500)}`);
  }
  const data = (await resp.json()) as AnthropicMessageResp;
  const text = data.content
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text!)
    .join("");
  return { text, usage: data.usage };
}

export function extractJson<T = unknown>(raw: string): T {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(raw);
  const candidate = (fenced?.[1] ?? raw).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("no JSON object in model output");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}
