import "server-only";

import { createGroq } from "@ai-sdk/groq";
import { generateText, type ModelMessage } from "ai";

/**
 * Groq + Vercel AI SDK client. If GROQ_API_KEY is set, calls the real API.
 * Otherwise runs in stub mode and returns deterministic fixtures so the
 * full UI/round-trip works locally without network or keys.
 */

const API_KEY = process.env.GROQ_API_KEY;
const MODEL_DEFAULT = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";

export const aiMode: "live" | "stub" = API_KEY ? "live" : "stub";

const provider = API_KEY ? createGroq({ apiKey: API_KEY }) : null;

type Message = { role: "user" | "assistant"; content: string };

type CallOpts = {
  system?: string;
  messages: Message[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
};

export async function callLLM(opts: CallOpts): Promise<{
  text: string;
  usage?: { input_tokens?: number; output_tokens?: number };
}> {
  if (!provider) {
    throw new Error("GROQ_API_KEY missing — caller should branch on aiMode");
  }
  const messages: ModelMessage[] = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  for (const m of opts.messages) messages.push(m);

  const result = await generateText({
    model: provider(opts.model ?? MODEL_DEFAULT),
    messages,
    maxOutputTokens: opts.maxTokens ?? 1024,
    temperature: opts.temperature ?? 0.4,
  });

  return {
    text: result.text,
    usage: {
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
    },
  };
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
