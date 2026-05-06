"use client";

import { useState } from "react";
import type { Node, ParamsSchema } from "@waku/ir";

import { api } from "@/trpc/react";

export type AiPickResult = {
  templateSlug: string;
  templateName: string;
  ir: Node;
  params: ParamsSchema;
  values: Record<string, unknown>;
  rationale: string;
};

export function AiAssistModal({
  open,
  onClose,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  onApply: (result: AiPickResult) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [contextText, setContextText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const mode = api.ai.mode.useQuery(undefined, { enabled: open });
  const balance = api.credits.balance.useQuery(undefined, { enabled: open });
  const pick = api.ai.pickTemplate.useMutation();

  if (!open) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!prompt.trim()) {
      setError("describe what you want");
      return;
    }
    try {
      const res = await pick.mutateAsync({
        prompt: prompt.trim(),
        contextText: contextText.trim() || undefined,
      });
      onApply(res);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ai pick failed");
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "#0009",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 92vw)",
          background: "#0b0f1a",
          border: "1px solid #1f2937",
          borderRadius: 14,
          padding: 20,
          color: "#e5e7eb",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>AI assist · pick a template</h3>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>
            {mode.data?.mode === "stub" ? "stub mode (no API key)" : "live"}
            {balance.data ? ` · ${balance.data.balance} credits` : ""}
          </span>
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>Describe the image</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="OG image announcing our v2 launch — bold, dark, with a green accent."
            rows={3}
            autoFocus
            style={inputStyle}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#9ca3af" }}>Optional context (paste page text)</span>
          <textarea
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            rows={2}
            style={inputStyle}
          />
        </label>

        {error && (
          <div style={{ fontSize: 12, color: "#fca5a5" }}>{error}</div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onClose} style={btn("ghost")}>
            cancel
          </button>
          <button type="submit" disabled={pick.isPending} style={btn("primary")}>
            {pick.isPending ? "thinking…" : "pick template"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#0a0e17",
  color: "#e5e7eb",
  border: "1px solid #1f2937",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 13,
  fontFamily: "inherit",
  resize: "vertical",
};

const btn = (variant: "primary" | "ghost"): React.CSSProperties => ({
  fontSize: 12,
  padding: "7px 14px",
  borderRadius: 6,
  cursor: "pointer",
  background: variant === "primary" ? "#7c5cff" : "transparent",
  color: variant === "primary" ? "white" : "#e5e7eb",
  border: variant === "primary" ? "none" : "1px solid #1f2937",
});
