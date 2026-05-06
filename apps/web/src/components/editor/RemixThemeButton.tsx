"use client";

import { useState } from "react";

import { api } from "@/trpc/react";

import { useEditorStore, useEditorStoreApi } from "./StoreProvider";

export function RemixThemeButton() {
  const apiStore = useEditorStoreApi();
  const setNode = useEditorStore((s) => s.setNode);
  const remix = api.ai.remixTheme.useMutation();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState("");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const s = apiStore.getState();
    try {
      const res = await remix.mutateAsync({
        ir: s.ir,
        paramsSchema: s.paramsSchema,
        direction: direction.trim() || undefined,
      });
      setNode("0", res.ir);
      setOpen(false);
      setDirection("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "remix failed");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Remix theme with AI"
        style={{
          fontSize: 12,
          padding: "6px 12px",
          borderRadius: 6,
          cursor: "pointer",
          background: "transparent",
          color: "#e5e7eb",
          border: "1px solid #1f2937",
        }}
      >
        ✨ remix
      </button>
      {open && (
        <div
          onClick={() => !remix.isPending && setOpen(false)}
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
              width: "min(420px, 92vw)",
              background: "#0b0f1a",
              border: "1px solid #1f2937",
              borderRadius: 12,
              padding: 18,
              color: "#e5e7eb",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600 }}>Remix theme</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>
              keeps layout & params; rewrites colors / accents
            </div>
            <input
              autoFocus
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              placeholder="e.g. darker · playful · minimal · sunset"
              style={{
                background: "#0a0e17",
                color: "#e5e7eb",
                border: "1px solid #1f2937",
                borderRadius: 8,
                padding: "8px 10px",
                fontSize: 13,
              }}
            />
            {error && (
              <div style={{ fontSize: 12, color: "#fca5a5" }}>{error}</div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={remix.isPending}
                style={{
                  fontSize: 12,
                  padding: "6px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: "transparent",
                  color: "#e5e7eb",
                  border: "1px solid #1f2937",
                }}
              >
                cancel
              </button>
              <button
                type="submit"
                disabled={remix.isPending}
                style={{
                  fontSize: 12,
                  padding: "6px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: "#7c5cff",
                  color: "white",
                  border: "none",
                }}
              >
                {remix.isPending ? "remixing…" : "remix"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
