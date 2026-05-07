"use client";

import { Eye, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; ms: number; status: number }
  | { kind: "error"; ms: number; status: number; message: string };

const DEBOUNCE_MS = 600;

export function LivePreviewPane({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [tick, setTick] = useState(0);
  const lastRevoke = useRef<string | null>(null);

  const debouncedUrl = useDebounced(url, DEBOUNCE_MS);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    const t0 = performance.now();
    setStatus({ kind: "loading" });

    fetch(debouncedUrl, { signal: ac.signal, cache: "no-store" })
      .then(async (res) => {
        const ms = Math.round(performance.now() - t0);
        if (!res.ok) {
          const errHeader = res.headers.get("x-waku-error") ?? "";
          const text = await res.text().catch(() => "");
          if (!cancelled) {
            setStatus({
              kind: "error",
              ms,
              status: res.status,
              message: errHeader || text.slice(0, 200) || res.statusText,
            });
            setImageUrl(null);
          }
          return;
        }
        const blob = await res.blob();
        if (cancelled) return;
        if (lastRevoke.current) URL.revokeObjectURL(lastRevoke.current);
        const obj = URL.createObjectURL(blob);
        lastRevoke.current = obj;
        setImageUrl(obj);
        setStatus({ kind: "ok", ms, status: res.status });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if ((err as { name?: string })?.name === "AbortError") return;
        const ms = Math.round(performance.now() - t0);
        setStatus({
          kind: "error",
          ms,
          status: 0,
          message: err instanceof Error ? err.message : "fetch failed",
        });
      });

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [debouncedUrl, tick]);

  useEffect(
    () => () => {
      if (lastRevoke.current) URL.revokeObjectURL(lastRevoke.current);
    },
    [],
  );

  return (
    <div className="absolute right-3 top-3 z-20 flex h-[calc(100%-1.5rem)] w-[360px] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
      <div className="flex h-9 items-center justify-between border-b border-zinc-200 px-3">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <Eye className="h-3.5 w-3.5" /> Live preview
        </span>
        <div className="flex items-center gap-1">
          <button
            title="Refresh"
            onClick={() => setTick((n) => n + 1)}
            className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center bg-zinc-50 p-3">
        {status.kind === "loading" && !imageUrl ? (
          <span className="text-xs text-zinc-500">Rendering…</span>
        ) : status.kind === "error" ? (
          <div className="space-y-1 text-center">
            <p className="text-xs font-medium text-rose-600">
              {status.status} · {status.message}
            </p>
            <p className="font-mono text-[10px] text-zinc-400">
              {status.ms} ms
            </p>
          </div>
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Live preview"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-xs text-zinc-400">No preview</span>
        )}
      </div>

      <div className="flex h-7 items-center justify-between border-t border-zinc-200 px-3 text-[10px] text-zinc-500">
        <span className="font-mono">
          {status.kind === "loading"
            ? "loading…"
            : status.kind === "ok"
              ? `${status.status} · ${status.ms} ms`
              : status.kind === "error"
                ? `${status.status} · ${status.ms} ms`
                : "—"}
        </span>
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            status.kind === "ok"
              ? "bg-emerald-500"
              : status.kind === "loading"
                ? "bg-amber-500"
                : status.kind === "error"
                  ? "bg-rose-500"
                  : "bg-zinc-300"
          }`}
        />
      </div>
    </div>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  const valueMemo = useMemo(() => value, [value]);
  useEffect(() => {
    const t = window.setTimeout(() => setV(valueMemo), ms);
    return () => window.clearTimeout(t);
  }, [valueMemo, ms]);
  return v;
}
