"use client";

import {
  Bookmark,
  Check,
  Copy,
  Download,
  Heart,
  Link as LinkIcon,
  MessageCircle,
  MessagesSquare,
  MoreHorizontal,
  Repeat2,
  Send,
  Share2,
  ThumbsUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  siBluesky,
  siDiscord,
  siFacebook,
  siImessage,
  siNotion,
  siReddit,
  siTelegram,
  siThreads,
  siWhatsapp,
  siX,
  type SimpleIcon,
} from "simple-icons";

export type Platform =
  | "x"
  | "linkedin"
  | "facebook"
  | "slack"
  | "discord"
  | "imessage"
  | "whatsapp"
  | "telegram"
  | "reddit"
  | "threads"
  | "bluesky"
  | "teams"
  | "notion";

const PLATFORM_ICONS: Partial<Record<Platform, SimpleIcon>> = {
  x: siX,
  facebook: siFacebook,
  discord: siDiscord,
  imessage: siImessage,
  whatsapp: siWhatsapp,
  telegram: siTelegram,
  reddit: siReddit,
  threads: siThreads,
  bluesky: siBluesky,
  notion: siNotion,
};

const VENDORED_PATHS: Partial<Record<Platform, string>> = {
  linkedin:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.063 2.063 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  slack:
    "M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z",
  teams:
    "M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zm5 4v2h3v7h2v-7h3V9H8z",
};

export function getPlatformIconPath(p: Platform): string | null {
  const si = PLATFORM_ICONS[p];
  if (si) return si.path;
  return VENDORED_PATHS[p] ?? null;
}

export function PlatformIcon({
  platform,
  className,
}: {
  platform: Platform;
  className?: string;
}) {
  const path = getPlatformIconPath(platform);
  if (!path) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className ?? "h-3.5 w-3.5"}
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

const DEBOUNCE_MS = 600;
const PREVIEW_WIDTH = 600;
const PREVIEW_QUALITY = 70;
const PREVIEW_FORMAT = "webp";

function withPreviewQuality(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("w", String(PREVIEW_WIDTH));
    u.searchParams.set("q", String(PREVIEW_QUALITY));
    if (!u.searchParams.has("format")) {
      u.searchParams.set("format", PREVIEW_FORMAT);
    }
    return u.toString();
  } catch {
    return url;
  }
}

function inferDownloadExt(url: string, contentType: string | null): string {
  if (contentType) {
    if (contentType.includes("png")) return "png";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
    if (contentType.includes("webp")) return "webp";
    if (contentType.includes("svg")) return "svg";
  }
  try {
    const fmt = new URL(url).searchParams.get("format");
    if (fmt) return fmt;
  } catch {}
  return "png";
}

function hasQueryParams(url: string | null): boolean {
  if (!url) return false;
  try {
    return new URL(url).searchParams.size > 0;
  } catch {
    return false;
  }
}

export type RenderStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; ms: number }
  | { kind: "error"; message: string };

// Ordered by approximate global MAU (most popular first).
export const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "whatsapp", label: "WhatsApp" }, // ~3.0B
  { id: "facebook", label: "Facebook" }, // ~3.0B
  { id: "imessage", label: "iMessage" }, // ~1B+
  { id: "telegram", label: "Telegram" }, // ~950M
  { id: "x", label: "X" }, // ~600M
  { id: "reddit", label: "Reddit" }, // ~500M
  { id: "linkedin", label: "LinkedIn" }, // ~310M
  { id: "teams", label: "Teams" }, // ~320M
  { id: "threads", label: "Threads" }, // ~275M
  { id: "discord", label: "Discord" }, // ~200M
  { id: "notion", label: "Notion" }, // ~100M
  { id: "slack", label: "Slack" }, // ~80M
  { id: "bluesky", label: "Bluesky" }, // ~30M
];

// `renderRev` is a monotonically-increasing token the editor shell bumps after
// every successful autosave. Including it in the deps (and as a cache-bust
// query param) forces a refetch when the doc has been re-rendered server-side
// even if the URL would otherwise be identical.
export function useRenderedImage(url: string | null, renderRev?: number) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<RenderStatus>({ kind: "idle" });
  const lastRevoke = useRef<string | null>(null);
  const debounced = useDebounced(url, DEBOUNCE_MS);

  useEffect(() => {
    if (!debounced) return;
    let cancelled = false;
    const ac = new AbortController();
    const t0 = performance.now();
    setStatus({ kind: "loading" });

    const base = withPreviewQuality(debounced);
    const fetchUrl =
      renderRev !== undefined
        ? `${base}${base.includes("?") ? "&" : "?"}_rev=${renderRev}`
        : base;

    fetch(fetchUrl, {
      signal: ac.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        const ms = Math.round(performance.now() - t0);
        if (!res.ok) {
          const errHeader = res.headers.get("x-waku-error") ?? "";
          const text = await res.text().catch(() => "");
          if (!cancelled) {
            setStatus({
              kind: "error",
              message: errHeader || text.slice(0, 160) || res.statusText,
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
        setStatus({ kind: "ok", ms });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if ((err as { name?: string })?.name === "AbortError") return;
        setStatus({
          kind: "error",
          message: err instanceof Error ? err.message : "fetch failed",
        });
      });

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [debounced, renderRev]);

  useEffect(
    () => () => {
      if (lastRevoke.current) URL.revokeObjectURL(lastRevoke.current);
    },
    [],
  );

  return { imageUrl, status };
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  const memo = useMemo(() => value, [value]);
  useEffect(() => {
    const t = window.setTimeout(() => setV(memo), ms);
    return () => window.clearTimeout(t);
  }, [memo, ms]);
  return v;
}

function hostname(url: string | null): string {
  if (!url) return "example.com";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "example.com";
  }
}

type CardCtx = {
  imageUrl: string | null;
  status: RenderStatus;
  url: string | null;
  handle: string;
};

export function OgSocialPreview({
  url,
  imageUrl,
  status,
  platform,
  handle = "yoursite",
}: {
  url: string | null;
  imageUrl: string | null;
  status: RenderStatus;
  platform: Platform;
  handle?: string;
}) {
  const ctx: CardCtx = { imageUrl, status, url, handle };

  return (
    <div className="mx-auto flex h-full w-full max-w-[720px] flex-col justify-center overflow-y-auto">
      {platform === "x" && <XCard ctx={ctx} />}
      {platform === "linkedin" && <LinkedInCard ctx={ctx} />}
      {platform === "facebook" && <FacebookCard ctx={ctx} />}
      {platform === "slack" && <SlackCard ctx={ctx} />}
      {platform === "discord" && <DiscordCard ctx={ctx} />}
      {platform === "imessage" && <IMessageCard ctx={ctx} />}
      {platform === "whatsapp" && <WhatsAppCard ctx={ctx} />}
      {platform === "telegram" && <TelegramCard ctx={ctx} />}
      {platform === "reddit" && <RedditCard ctx={ctx} />}
      {platform === "threads" && <ThreadsCard ctx={ctx} />}
      {platform === "bluesky" && <BlueskyCard ctx={ctx} />}
      {platform === "teams" && <TeamsCard ctx={ctx} />}
      {platform === "notion" && <NotionCard ctx={ctx} />}
    </div>
  );
}

export function StatusDot({ status }: { status: RenderStatus }) {
  return (
    <span
      title={
        status.kind === "loading"
          ? "rendering…"
          : status.kind === "ok"
            ? `${status.ms} ms`
            : status.kind === "error"
              ? status.message
              : ""
      }
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
        status.kind === "ok"
          ? "bg-emerald-500"
          : status.kind === "loading"
            ? "bg-amber-500"
            : status.kind === "error"
              ? "bg-rose-500"
              : "bg-zinc-300"
      }`}
    />
  );
}

export function OgPreviewActions({
  url,
  filename = "og-image",
}: {
  url: string | null;
  filename?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const hasParams = useMemo(() => hasQueryParams(url), [url]);

  const copyUrl = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  const download = async () => {
    if (!url || downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const header = res.headers.get("x-waku-error");
        throw new Error(header || res.statusText || "render failed");
      }
      const blob = await res.blob();
      const ext = inferDownloadExt(url, res.headers.get("content-type"));
      const obj = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = obj;
      a.download = `${filename}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(obj);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div
        className={`flex border-t ${
          copied
            ? "border-emerald-300 bg-emerald-100"
            : "border-emerald-200 bg-emerald-50"
        }`}
      >
        <button
          onClick={copyUrl}
          disabled={!url}
          title={url ?? undefined}
          className={`group flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-[11px] transition-colors disabled:opacity-50 ${
            copied ? "" : "hover:bg-emerald-100/60"
          }`}
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
              copied
                ? "bg-emerald-200 text-emerald-800"
                : "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200"
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </span>
          <span
            className={`min-w-0 flex-1 truncate text-left font-mono ${
              copied ? "text-emerald-800" : "text-emerald-900"
            }`}
          >
            {copied ? "Copied to clipboard" : (url ?? "no url")}
          </span>
          <span
            className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-white transition-colors ${
              copied
                ? "bg-emerald-600"
                : "bg-emerald-700 group-hover:bg-emerald-800"
            }`}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy
              </>
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={download}
          disabled={!url || downloading}
          title={downloadError ?? "Download rendered image"}
          className="flex shrink-0 items-center gap-1.5 border-l border-emerald-200 px-3 text-[11px] font-medium text-emerald-900 hover:bg-emerald-100/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          {downloading ? "Downloading…" : "Download"}
        </button>
      </div>
      {hasParams ? (
        <div className="border-t border-zinc-200 bg-white px-2 py-1 text-[10px] italic text-zinc-500">
          Download bakes current param values into the image — share the URL to keep them dynamic.
        </div>
      ) : null}
      {downloadError ? (
        <div className="border-t border-rose-200 bg-rose-50 px-2 py-1 text-[10px] text-rose-700">
          {downloadError}
        </div>
      ) : null}
    </div>
  );
}

const OG_IMAGE_TRANSITION = {
  type: "spring" as const,
  stiffness: 320,
  damping: 32,
};

function OgImage({
  ctx,
  className,
  rounded = false,
}: {
  ctx: CardCtx;
  className?: string;
  rounded?: boolean;
}) {
  const loading = ctx.status.kind === "loading";
  return (
    <motion.div
      layoutId="og-preview-image"
      transition={OG_IMAGE_TRANSITION}
      className={`relative w-full overflow-hidden bg-zinc-100 ${
        rounded ? "rounded-md" : ""
      } ${className ?? ""}`}
      style={{ aspectRatio: "1.91 / 1" }}
    >
      {ctx.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={ctx.imageUrl}
          alt="OG preview"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : ctx.status.kind === "error" ? (
        <div className="absolute inset-0 flex items-center justify-center p-2 text-center text-[10px] text-rose-600">
          {ctx.status.message}
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-400">
          {loading ? "rendering…" : "no preview"}
        </div>
      )}
      {loading ? <GeneratingGlow /> : null}
    </motion.div>
  );
}

function GeneratingGlow() {
  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        animate={{ opacity: [0.35, 0.7, 0.35] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(60% 60% at 20% 30%, rgba(124,92,255,0.45), transparent 70%), radial-gradient(60% 60% at 80% 70%, rgba(236,72,153,0.4), transparent 70%), radial-gradient(40% 40% at 50% 90%, rgba(34,211,238,0.35), transparent 70%)",
        }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.45) 50%, transparent 65%)",
        }}
        initial={{ x: "-120%" }}
        animate={{ x: "120%" }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          boxShadow:
            "inset 0 0 0 1px rgba(124,92,255,0.6), inset 0 0 22px rgba(124,92,255,0.35), inset 0 0 60px rgba(236,72,153,0.18)",
        }}
      />
    </>
  );
}

function Avatar({
  initial,
  color = "bg-indigo-500",
}: {
  initial: string;
  color?: string;
}) {
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white ${color}`}
    >
      {initial.slice(0, 1).toUpperCase()}
    </div>
  );
}

function XCard({ ctx }: { ctx: CardCtx }) {
  const host = hostname(ctx.url);
  return (
    <div className="flex h-full flex-col justify-center bg-white p-3 font-sans text-zinc-900">
      <div className="flex items-start gap-2">
        <Avatar initial={ctx.handle} color="bg-zinc-900" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[12px]">
            <span className="font-bold">{ctx.handle}</span>
            <span className="text-zinc-500">@{ctx.handle} · 2h</span>
            <MoreHorizontal className="ml-auto h-3.5 w-3.5 text-zinc-400" />
          </div>
          <p className="mt-0.5 text-[12px] leading-snug">
            New template just shipped — check it out 👇
          </p>
          <div className="mt-2 overflow-hidden rounded-2xl border border-zinc-200">
            <OgImage ctx={ctx} />
            <div className="border-t border-zinc-200 px-2.5 py-1.5 text-[10px] text-zinc-500">
              From {host}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />5
            </span>
            <span className="flex items-center gap-1">
              <Repeat2 className="h-3.5 w-3.5" />
              12
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              42
            </span>
            <span className="flex items-center gap-1">
              <Bookmark className="h-3.5 w-3.5" />
            </span>
            <span className="flex items-center gap-1">
              <Share2 className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkedInCard({ ctx }: { ctx: CardCtx }) {
  const host = hostname(ctx.url);
  return (
    <div className="flex h-full flex-col justify-center bg-white p-3 font-sans text-zinc-900">
      <div className="flex items-start gap-2">
        <Avatar initial={ctx.handle} color="bg-sky-700" />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold">{ctx.handle}</div>
          <div className="text-[10px] text-zinc-500">You · 2h · 🌐</div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-zinc-400" />
      </div>
      <p className="mt-2 text-[12px] leading-snug">
        Sharing a new template we just published.
      </p>
      <div className="mt-2 overflow-hidden border border-zinc-200">
        <OgImage ctx={ctx} />
        <div className="bg-zinc-50 px-3 py-2">
          <div className="text-[12px] font-semibold leading-tight">
            Page title from {host}
          </div>
          <div className="mt-0.5 truncate text-[10px] uppercase text-zinc-500">
            {host}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-zinc-600">
        <span className="flex items-center gap-1">
          <ThumbsUp className="h-3.5 w-3.5" /> Like
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" /> Comment
        </span>
        <span className="flex items-center gap-1">
          <Repeat2 className="h-3.5 w-3.5" /> Repost
        </span>
        <span className="flex items-center gap-1">
          <Send className="h-3.5 w-3.5" /> Send
        </span>
      </div>
    </div>
  );
}

function FacebookCard({ ctx }: { ctx: CardCtx }) {
  const host = hostname(ctx.url);
  return (
    <div className="flex h-full flex-col justify-center bg-white p-3 font-sans text-zinc-900">
      <div className="flex items-start gap-2">
        <Avatar initial={ctx.handle} color="bg-blue-600" />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold">{ctx.handle}</div>
          <div className="text-[10px] text-zinc-500">2h · 🌐</div>
        </div>
        <MoreHorizontal className="h-4 w-4 text-zinc-400" />
      </div>
      <p className="mt-2 text-[12px] leading-snug">
        Just published a new template.
      </p>
      <div className="mt-2 overflow-hidden border border-zinc-200">
        <OgImage ctx={ctx} />
        <div className="bg-zinc-100 px-3 py-2">
          <div className="truncate text-[10px] uppercase text-zinc-500">
            {host}
          </div>
          <div className="text-[12px] font-semibold leading-tight">
            Page title from {host}
          </div>
          <div className="mt-0.5 line-clamp-2 text-[11px] text-zinc-600">
            A short description of this page generated from your OG meta.
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2 text-[11px] font-medium text-zinc-600">
        <span className="flex items-center gap-1">
          <ThumbsUp className="h-3.5 w-3.5" /> Like
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" /> Comment
        </span>
        <span className="flex items-center gap-1">
          <Share2 className="h-3.5 w-3.5" /> Share
        </span>
      </div>
    </div>
  );
}

function SlackCard({ ctx }: { ctx: CardCtx }) {
  const host = hostname(ctx.url);
  return (
    <div className="flex h-full flex-col justify-center bg-white p-3 font-sans text-zinc-900">
      <div className="flex items-start gap-2">
        <Avatar initial={ctx.handle} color="bg-purple-700" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 text-[12px]">
            <span className="font-bold">{ctx.handle}</span>
            <span className="text-[10px] text-zinc-500">2:14 PM</span>
          </div>
          <p className="mt-0.5 truncate text-[12px]">
            Sharing this — {ctx.url ?? "..."}
          </p>
          <div className="mt-2 flex gap-2">
            <div className="w-[3px] shrink-0 rounded-sm bg-zinc-300" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-zinc-500">{host}</div>
              <div className="mt-0.5 text-[12px] font-semibold text-sky-700">
                Page title from {host}
              </div>
              <div className="mt-0.5 line-clamp-2 text-[11px] text-zinc-700">
                A short description of this page generated from your OG meta.
              </div>
              <div className="mt-2 max-w-[320px]">
                <OgImage ctx={ctx} rounded />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiscordCard({ ctx }: { ctx: CardCtx }) {
  const host = hostname(ctx.url);
  return (
    <div className="flex h-full flex-col justify-center bg-[#313338] p-3 font-sans text-zinc-100">
      <div className="flex items-start gap-2">
        <Avatar initial={ctx.handle} color="bg-indigo-500" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 text-[12px]">
            <span className="font-semibold text-white">{ctx.handle}</span>
            <span className="text-[10px] text-zinc-400">Today at 2:14 PM</span>
          </div>
          <p className="mt-0.5 truncate text-[12px] text-zinc-200">
            Check this out —{" "}
            <span className="text-sky-400 underline">{ctx.url ?? "link"}</span>
          </p>
          <div className="mt-2 overflow-hidden rounded-md border-l-4 border-indigo-400 bg-[#2b2d31] px-3 py-2">
            <div className="text-[10px] text-zinc-400">{host}</div>
            <div className="mt-0.5 text-[12px] font-semibold text-sky-400">
              Page title from {host}
            </div>
            <div className="mt-0.5 line-clamp-2 text-[11px] text-zinc-300">
              A short description of this page generated from your OG meta.
            </div>
            <div className="mt-2 max-w-[340px]">
              <OgImage ctx={ctx} rounded />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IMessageCard({ ctx }: { ctx: CardCtx }) {
  const host = hostname(ctx.url);
  return (
    <div className="flex h-full flex-col items-end justify-center bg-zinc-50 p-3 font-sans text-zinc-900">
      <div className="w-full max-w-[280px]">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <OgImage ctx={ctx} />
          <div className="px-3 py-2">
            <div className="text-[12px] font-semibold leading-tight">
              Page title from {host}
            </div>
            <div className="mt-0.5 truncate text-[10px] text-zinc-500">
              {host}
            </div>
          </div>
        </div>
        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-zinc-400">
          <MessagesSquare className="h-3 w-3" /> iMessage · Delivered
        </div>
      </div>
    </div>
  );
}

function WhatsAppCard({ ctx }: { ctx: CardCtx }) {
  const host = hostname(ctx.url);
  return (
    <div className="flex h-full flex-col items-end justify-center bg-[#e5ddd5] p-3 font-sans text-zinc-900">
      <div className="w-full max-w-[300px] rounded-lg bg-[#dcf8c6] p-1.5 shadow-sm">
        <div className="overflow-hidden rounded-md bg-white/60">
          <OgImage ctx={ctx} />
          <div className="px-2 py-1.5">
            <div className="text-[12px] font-semibold leading-tight">
              Page title from {host}
            </div>
            <div className="mt-0.5 line-clamp-2 text-[11px] text-zinc-600">
              A short description of this page generated from your OG meta.
            </div>
            <div className="mt-0.5 truncate text-[10px] uppercase text-zinc-500">
              {host}
            </div>
          </div>
        </div>
        <div className="truncate px-1 pt-1 text-[11px] text-zinc-700">
          {ctx.url ?? "link"}
        </div>
        <div className="flex items-center justify-end gap-1 px-1 pt-0.5 text-[9px] text-zinc-500">
          2:14 PM ✓✓
        </div>
      </div>
    </div>
  );
}

function TelegramCard({ ctx }: { ctx: CardCtx }) {
  const host = hostname(ctx.url);
  return (
    <div className="flex h-full flex-col justify-center bg-[#e7ebf0] p-3 font-sans text-zinc-900">
      <div className="max-w-[320px] rounded-2xl rounded-bl-md bg-white p-2 shadow-sm">
        <div className="flex gap-2 border-l-[3px] border-[#26a5e4] pl-2">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-[#26a5e4]">
              {host}
            </div>
            <div className="mt-0.5 text-[12px] font-semibold leading-tight">
              Page title from {host}
            </div>
            <div className="mt-0.5 line-clamp-2 text-[11px] text-zinc-700">
              A short description of this page generated from your OG meta.
            </div>
          </div>
        </div>
        <div className="mt-2 overflow-hidden rounded-lg">
          <OgImage ctx={ctx} />
        </div>
        <div className="flex items-center justify-end gap-1 pt-1 text-[9px] text-zinc-500">
          2:14 PM
        </div>
      </div>
    </div>
  );
}

function RedditCard({ ctx }: { ctx: CardCtx }) {
  const host = hostname(ctx.url);
  return (
    <div className="flex h-full flex-col justify-center bg-white p-3 font-sans text-zinc-900">
      <div className="rounded-lg border border-zinc-200 p-3">
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <div className="h-4 w-4 rounded-full bg-orange-500" />
          <span className="font-semibold text-zinc-800">r/programming</span>
          <span>· Posted by u/{ctx.handle} · 2h</span>
        </div>
        <div className="mt-2 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-semibold leading-tight">
              Page title from {host}
            </h3>
            <a className="mt-1 block truncate text-[10px] text-sky-700">
              {host}
            </a>
          </div>
          <div className="w-[120px] shrink-0 overflow-hidden rounded-md">
            <OgImage ctx={ctx} />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3 text-[10px] font-semibold text-zinc-500">
          <span>▲ 1.2k ▼</span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" /> 142
          </span>
          <span className="flex items-center gap-1">
            <Share2 className="h-3 w-3" /> Share
          </span>
        </div>
      </div>
    </div>
  );
}

function ThreadsCard({ ctx }: { ctx: CardCtx }) {
  const host = hostname(ctx.url);
  return (
    <div className="flex h-full flex-col justify-center bg-white p-3 font-sans text-zinc-900">
      <div className="flex items-start gap-2">
        <Avatar initial={ctx.handle} color="bg-zinc-900" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[12px]">
            <span className="font-semibold">{ctx.handle}</span>
            <span className="text-zinc-500">· 2h</span>
            <MoreHorizontal className="ml-auto h-3.5 w-3.5 text-zinc-400" />
          </div>
          <p className="mt-0.5 text-[12px] leading-snug">
            Just shipped a new template — link below.
          </p>
          <div className="mt-2 overflow-hidden rounded-2xl border border-zinc-200">
            <OgImage ctx={ctx} />
            <div className="border-t border-zinc-200 px-2.5 py-1.5">
              <div className="text-[11px] font-semibold leading-tight">
                Page title from {host}
              </div>
              <div className="mt-0.5 truncate text-[10px] text-zinc-500">
                {host}
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-4 text-[11px] text-zinc-500">
            <Heart className="h-4 w-4" />
            <MessageCircle className="h-4 w-4" />
            <Repeat2 className="h-4 w-4" />
            <Send className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

function BlueskyCard({ ctx }: { ctx: CardCtx }) {
  const host = hostname(ctx.url);
  return (
    <div className="flex h-full flex-col justify-center bg-white p-3 font-sans text-zinc-900">
      <div className="flex items-start gap-2">
        <Avatar initial={ctx.handle} color="bg-[#1185fe]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[12px]">
            <span className="font-semibold">{ctx.handle}</span>
            <span className="text-zinc-500">
              @{ctx.handle}.bsky.social · 2h
            </span>
            <MoreHorizontal className="ml-auto h-3.5 w-3.5 text-zinc-400" />
          </div>
          <p className="mt-0.5 text-[12px] leading-snug">
            New template — sharing here too 🦋
          </p>
          <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200">
            <OgImage ctx={ctx} />
            <div className="border-t border-zinc-200 px-2.5 py-1.5">
              <div className="text-[11px] font-semibold leading-tight">
                Page title from {host}
              </div>
              <div className="mt-0.5 line-clamp-2 text-[10px] text-zinc-600">
                A short description of this page.
              </div>
              <div className="mt-0.5 truncate text-[10px] text-zinc-500">
                {host}
              </div>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-5 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" /> 5
            </span>
            <span className="flex items-center gap-1">
              <Repeat2 className="h-3.5 w-3.5" /> 12
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" /> 42
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamsCard({ ctx }: { ctx: CardCtx }) {
  const host = hostname(ctx.url);
  return (
    <div className="flex h-full flex-col justify-center bg-[#f5f5f7] p-3 font-sans text-zinc-900">
      <div className="flex items-start gap-2">
        <Avatar initial={ctx.handle} color="bg-[#5b5fc7]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 text-[12px]">
            <span className="font-semibold">{ctx.handle}</span>
            <span className="text-[10px] text-zinc-500">2:14 PM</span>
          </div>
          <div className="mt-1 overflow-hidden rounded-md bg-white shadow-sm">
            <OgImage ctx={ctx} />
            <div className="px-3 py-2">
              <div className="truncate text-[10px] uppercase text-zinc-500">
                {host}
              </div>
              <div className="text-[12px] font-semibold leading-tight">
                Page title from {host}
              </div>
              <div className="mt-0.5 line-clamp-2 text-[11px] text-zinc-600">
                A short description of this page generated from your OG meta.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotionCard({ ctx }: { ctx: CardCtx }) {
  const host = hostname(ctx.url);
  return (
    <div className="flex h-full flex-col justify-center bg-white p-3 font-sans text-zinc-900">
      <div className="flex items-stretch overflow-hidden rounded-md border border-zinc-200">
        <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
          <div className="min-w-0">
            <div className="truncate text-[12px] font-semibold leading-tight">
              Page title from {host}
            </div>
            <div className="mt-1 line-clamp-2 text-[11px] text-zinc-600">
              A short description of this page generated from your OG meta.
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 truncate text-[10px] text-zinc-500">
            <div className="h-3 w-3 rounded-sm bg-zinc-300" />
            <span className="truncate">{ctx.url ?? host}</span>
          </div>
        </div>
        <div className="flex w-[140px] shrink-0 items-center bg-zinc-50">
          <OgImage ctx={ctx} />
        </div>
      </div>
    </div>
  );
}
