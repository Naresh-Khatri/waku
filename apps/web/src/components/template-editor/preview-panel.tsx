"use client";

import {
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Link,
  Pencil,
  RotateCcw,
  Save,
  Sliders,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/trpc/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ColorPicker } from "./color-picker";
import {
  OgSocialPreview,
  PLATFORMS,
  PlatformIcon,
  StatusDot,
  useRenderedImage,
  type Platform,
} from "./og-preview";
import { useEditor } from "./store";
import { effectiveParams, isParamRef } from "./types";
import type {
  Artboard,
  EditorNode,
  ParamSchemaEntry,
  TemplateDocument,
} from "./types";
import { searchFromParams } from "./url-params";

const TRANSITION = { type: "spring" as const, stiffness: 320, damping: 32 };

type Props = {
  liveUrl?: string;
  templateId: string;
  handle: string;
  templateSlug: string;
  renderBase: string;
};

export function PreviewPanel({
  liveUrl,
  templateId,
  handle,
  templateSlug,
  renderBase,
}: Props) {
  const paramsSchema = useEditor((s) => s.paramsSchema);
  const draftValues = useEditor((s) => s.draftValues);
  const setDraftValue = useEditor((s) => s.setDraftValue);
  const loadDocument = useEditor((s) => s.loadDocument);
  const nodes = useEditor((s) => s.nodes);
  const artboard = useEditor((s) => s.artboard);

  const expanded = useEditor((s) => s.previewOpen);
  const setExpanded = useEditor((s) => s.setPreviewOpen);

  const [tab, setTab] = useState<"preview" | "history">("preview");
  const [copied, setCopied] = useState(false);
  const [platform, setPlatform] = useState<Platform>("x");
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!expanded) return;
    const onMouseDown = (e: MouseEvent) => {
      const node = panelRef.current;
      if (!node) return;
      if (e.target instanceof Node && !node.contains(e.target)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [expanded, setExpanded]);

  const utils = api.useUtils();
  const snapshots = api.template.listSnapshots.useQuery(
    { templateId },
    { enabled: expanded },
  );
  const create = api.template.createSnapshot.useMutation({
    onSuccess: () => {
      utils.template.listSnapshots.invalidate({ templateId });
      setTab("history");
    },
  });
  const restore = api.template.restoreSnapshot.useMutation({
    onSuccess: (head) => {
      if (head?.documentJson) {
        loadDocument(head.documentJson as TemplateDocument);
      }
    },
  });
  const rename = api.template.renameSnapshot.useMutation({
    onSuccess: () => utils.template.listSnapshots.invalidate({ templateId }),
  });
  const del = api.template.deleteSnapshot.useMutation({
    onSuccess: () => utils.template.listSnapshots.invalidate({ templateId }),
  });

  // Only surface params that are actually wired into a node or the artboard —
  // an unbound schema entry has no visible effect, so editing it is just noise.
  const boundParams = useMemo(
    () => collectBoundParams(nodes, artboard),
    [nodes, artboard],
  );
  const entries = useMemo(
    () =>
      Object.entries(paramsSchema)
        .filter(([name]) => boundParams.has(name))
        .sort(([a], [b]) => a.localeCompare(b)),
    [paramsSchema, boundParams],
  );

  // Bake effective params (drafts falling back to schema defaults) into every
  // URL we build. The renderer reads only what's in the query string, so a
  // bare URL would silently drop bound-but-not-overridden params and render
  // their fallbacks — diverging from the canvas which uses effective values.
  const effective = effectiveParams(paramsSchema, draftValues);
  const qs = searchFromParams(effective, paramsSchema).toString();
  const appendQs = (base: string) =>
    qs.length === 0 ? base : `${base}${base.includes("?") ? "&" : "?"}${qs}`;
  const fullUrl = liveUrl ? appendQs(liveUrl) : null;
  const showPreview = Boolean(liveUrl && fullUrl);
  const { imageUrl, status } = useRenderedImage(showPreview ? fullUrl : null);
  const buildSnapshotUrl = (version: number): string =>
    appendQs(`${renderBase}/r/${handle}/${templateSlug}/${version}`);

  const copyUrl = async () => {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  const snapshotCount = snapshots.data?.length ?? 0;

  return (
    <>
      <AnimatePresence>
        {expanded ? (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setExpanded(false)}
            className="backdrop-blur-xs fixed inset-0 z-[5] bg-black/10"
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {!expanded ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                key="trigger"
                layoutId="preview-panel"
                transition={TRANSITION}
                onClick={() => setExpanded(true)}
                title="Show preview"
              >
                <Button variant={"default"}>
                  <Upload />
                  <span>Export</span>
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export to a static image</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <motion.div
            key="panel"
            ref={panelRef}
            layoutId="preview-panel"
            transition={TRANSITION}
            className="fixed right-3 top-2 z-[60] flex h-[475px] w-[720px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-md border border-zinc-200 bg-white text-xs shadow-md"
          >
            <header className="flex h-9 shrink-0 items-center gap-1 border-b border-zinc-200 px-2">
              <TabButton
                active={tab === "preview"}
                onClick={() => setTab("preview")}
              >
                preview
              </TabButton>
              <TabButton
                active={tab === "history"}
                onClick={() => setTab("history")}
              >
                History
                {snapshotCount > 0 ? (
                  <span
                    className={`ml-1 text-[10px] ${
                      tab === "history" ? "text-zinc-300" : "text-zinc-400"
                    }`}
                  >
                    {snapshotCount}
                  </span>
                ) : null}
              </TabButton>
              <div className="ml-auto flex items-center gap-1.5">
                {tab === "preview" ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex h-6 w-6 items-center justify-center rounded-md border border-zinc-200 bg-white shadow-sm">
                        <StatusDot status={status} />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {status.kind === "ok"
                        ? `rendered in ${status.ms}ms`
                        : status.kind === "loading"
                          ? "rendering…"
                          : status.kind === "error"
                            ? status.message
                            : "idle"}
                    </TooltipContent>
                  </Tooltip>
                ) : null}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setExpanded(false)}
                      aria-label="Hide"
                      className="border border-zinc-200 bg-zinc-100 text-zinc-600 shadow-sm hover:border-zinc-300 hover:bg-zinc-200 hover:text-zinc-900"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Hide</TooltipContent>
                </Tooltip>
              </div>
            </header>

            {tab === "preview" ? (
              <>
                <div className="flex min-h-0 flex-1">
                  <div className="flex w-[280px] shrink-0 flex-col">
                    {entries.length === 0 ? (
                      <div className="flex-1 px-3 py-3 text-[11px] text-zinc-500">
                        Click the link icon next to a field to bind a param.
                      </div>
                    ) : (
                      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                        <div className="space-y-2 pr-1">
                          {entries.map(([name, entry]) => (
                            <ParamRow
                              key={name}
                              name={name}
                              entry={entry}
                              value={draftValues[name]}
                              onChange={(v) => setDraftValue(name, v)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {showPreview ? (
                    <div className="flex w-[440px] shrink-0 flex-col border-l border-zinc-200 bg-zinc-50">
                      <div className="min-h-0 flex-1 overflow-hidden">
                        <OgSocialPreview
                          url={fullUrl}
                          imageUrl={imageUrl}
                          status={status}
                          platform={platform}
                          handle={handle}
                        />
                      </div>
                      <div className="flex shrink-0 border-t border-zinc-200 bg-white">
                        <div className="relative min-w-0 flex-1 overflow-hidden">
                          <div className="flex h-9 items-center gap-1 overflow-x-auto px-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {PLATFORMS.map((p) => {
                              const active = platform === p.id;
                              return (
                                <button
                                  key={p.id}
                                  onClick={() => setPlatform(p.id)}
                                  title={p.label}
                                  aria-label={p.label}
                                  className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                                    active
                                      ? "text-white"
                                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                                  }`}
                                >
                                  {active ? (
                                    <motion.span
                                      layoutId="platform-pill"
                                      transition={TRANSITION}
                                      className="absolute inset-0 rounded-md bg-zinc-900"
                                    />
                                  ) : null}
                                  <span className="relative flex items-center justify-center">
                                    <PlatformIcon platform={p.id} />
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent" />
                          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent" />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                {liveUrl ? (
                  <>
                    {create.error ? (
                      <div className="flex shrink-0 items-center gap-2 border-t border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] text-rose-800">
                        <span className="font-semibold">Snapshot failed:</span>
                        <span className="min-w-0 flex-1 truncate">
                          {create.error.message}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => create.reset()}
                          aria-label="Dismiss"
                          className="size-5 text-rose-600 hover:bg-rose-100 hover:text-rose-900"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : null}
                    <div
                      className={`flex shrink-0 border-t ${
                        copied
                          ? "border-emerald-300 bg-emerald-100"
                          : "border-emerald-200 bg-emerald-50"
                      }`}
                    >
                      <button
                        onClick={copyUrl}
                        title={fullUrl ?? undefined}
                        className={`group flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-[11px] transition-colors ${
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
                          <Link className="h-3.5 w-3.5" />
                        </span>
                        <span
                          className={`min-w-0 flex-1 truncate text-left font-mono ${
                            copied ? "text-emerald-800" : "text-emerald-900"
                          }`}
                        >
                          {copied
                            ? "Copied to clipboard"
                            : (fullUrl ?? liveUrl)}
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
                        onClick={() => create.mutate({ templateId })}
                        disabled={create.isPending}
                        className="flex shrink-0 items-center gap-1.5 border-l border-emerald-200 px-3 text-[11px] font-medium text-emerald-900 hover:bg-emerald-100/60 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Save snapshot"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {create.isPending ? "Saving…" : "Snapshot"}
                      </button>
                    </div>
                  </>
                ) : null}
              </>
            ) : (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {snapshots.isLoading ? (
                    <p className="p-4 text-xs text-zinc-400">Loading…</p>
                  ) : snapshots.data && snapshots.data.length > 0 ? (
                    <Accordion
                      type="single"
                      collapsible
                      key={snapshots.data[0]?.id}
                      defaultValue={snapshots.data[0]?.id}
                      className="flex flex-col"
                    >
                      {snapshots.data.map((s) => (
                        <SnapshotRow
                          key={s.id}
                          snapshot={s}
                          url={buildSnapshotUrl(s.version)}
                          restoring={
                            restore.isPending &&
                            restore.variables?.versionId === s.id
                          }
                          onRestore={() => restore.mutate({ versionId: s.id })}
                          onRename={(label) =>
                            rename.mutate({ versionId: s.id, label })
                          }
                          onDelete={() => del.mutate({ versionId: s.id })}
                        />
                      ))}
                    </Accordion>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                      <p className="text-xs text-zinc-500">No snapshots yet.</p>
                      <p className="text-[11px] text-zinc-400">
                        Save one to keep a stable URL while you iterate.
                      </p>
                    </div>
                  )}
                </div>

                <footer className="shrink-0 border-t border-zinc-200 p-3">
                  <Button
                    type="button"
                    onClick={() => create.mutate({ templateId })}
                    disabled={create.isPending}
                    className="w-full bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    {create.isPending ? "Saving…" : "+ Save snapshot"}
                  </Button>
                  {create.error ? (
                    <p className="mt-2 text-[11px] text-rose-600">
                      {create.error.message}
                    </p>
                  ) : null}
                </footer>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-7 px-2.5 text-[11px] font-semibold uppercase tracking-wide",
        active
          ? "bg-zinc-900 text-white hover:bg-zinc-800 hover:text-white"
          : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800",
      )}
    >
      {children}
    </Button>
  );
}

type Snapshot = {
  id: string;
  version: number;
  label: string | null;
  createdAt: Date;
};

function SnapshotRow({
  snapshot,
  url,
  restoring,
  onRestore,
  onRename,
  onDelete,
}: {
  snapshot: Snapshot;
  url: string;
  restoring: boolean;
  onRestore: () => void;
  onRename: (label: string | null) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(snapshot.label ?? "");
  const [copied, setCopied] = useState(false);

  const display = snapshot.label ?? `Snapshot v${snapshot.version}`;

  const submitRename = () => {
    const trimmed = label.trim();
    onRename(trimmed.length > 0 ? trimmed : null);
    setEditing(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <AccordionItem
      value={snapshot.id}
      className="border-b border-zinc-100 last:border-b-0"
    >
      <AccordionTrigger asChild>
        <div
          role="button"
          tabIndex={editing ? -1 : 0}
          className="group flex cursor-pointer items-start gap-2 px-3 py-3 text-left hover:bg-zinc-50 data-[state=open]:bg-zinc-50"
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-zinc-400 transition-transform duration-200 group-data-[state=open]:rotate-90">
            <ChevronRight className="h-3 w-3" />
          </span>
          <div className="min-w-0 flex-1">
            {editing ? (
              <Input
                autoFocus
                value={label}
                onClick={stop}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Enter") submitRename();
                  if (e.key === "Escape") {
                    setLabel(snapshot.label ?? "");
                    setEditing(false);
                  }
                }}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={submitRename}
                placeholder="Name this snapshot"
                className="h-7 border-indigo-300 text-xs focus-visible:border-indigo-500"
              />
            ) : (
              <div className="flex min-w-0 items-center gap-1">
                <p className="min-w-0 truncate text-xs font-medium text-zinc-800">
                  {display}
                </p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={(e) => {
                        stop(e);
                        setEditing(true);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      aria-label="Rename"
                      className="size-5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Rename</TooltipContent>
                </Tooltip>
              </div>
            )}
            <p className="mt-0.5 text-[10px] text-zinc-400">
              {formatRelative(snapshot.createdAt)} · v{snapshot.version}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    stop(e);
                    onRestore();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  disabled={restoring}
                  aria-label="Restore"
                  className="text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <RotateCcw
                    className={cn("h-3.5 w-3.5", restoring && "animate-spin")}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {restoring ? "Restoring…" : "Restore"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    stop(e);
                    if (confirm(`Delete "${display}"?`)) onDelete();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Delete"
                  className="text-zinc-500 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-3 pb-3 pl-9">
        <code className="block min-w-0 break-all rounded border border-zinc-200 bg-zinc-50 px-2 py-1.5 font-mono text-[10px] leading-relaxed">
          <ColoredUrl url={url} />
        </code>
        <div className="mt-2 flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={copy}
            className={cn(
              "text-[11px]",
              copied
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
                : "border-zinc-200 text-zinc-700",
            )}
          >
            {copied ? (
              <Check className="h-3 w-3" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            asChild
            variant="outline"
            size="xs"
            className="border-zinc-200 text-[11px] text-zinc-700"
          >
            <a href={url} target="_blank" rel="noreferrer noopener">
              <ExternalLink className="h-3 w-3" />
              Open
            </a>
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// Render a snapshot URL with each `?key=value` colored by key. Keys hash to a
// fixed palette so the same param always reads in the same color across rows —
// scanning a list of similar URLs becomes pattern-matching, not string-diffing.
function ColoredUrl({ url }: { url: string }) {
  const qIdx = url.indexOf("?");
  if (qIdx === -1) {
    return <span className="text-zinc-600">{url}</span>;
  }
  const base = url.slice(0, qIdx);
  const pairs = url.slice(qIdx + 1).split("&");
  return (
    <>
      <span className="text-zinc-600">{base}</span>
      {pairs.map((pair, i) => {
        const sep = i === 0 ? "?" : "&";
        const eqIdx = pair.indexOf("=");
        if (eqIdx === -1) {
          return (
            <span key={`${pair}-${i}`} className="text-zinc-500">
              {sep}
              {pair}
            </span>
          );
        }
        const k = pair.slice(0, eqIdx);
        const v = pair.slice(eqIdx + 1);
        const color = bindColor(k);
        return (
          <span key={`${k}-${i}`}>
            <span className="text-zinc-400">{sep}</span>
            <span className={`font-semibold ${color}`}>{k}</span>
            <span className="text-zinc-400">=</span>
            <span className={color}>{v}</span>
          </span>
        );
      })}
    </>
  );
}

// Tailwind needs full class strings present in source for JIT. Same key always
// lands on the same color so a param reads consistently across snapshot rows.
const BIND_PALETTE = [
  "text-rose-700",
  "text-amber-700",
  "text-emerald-700",
  "text-sky-700",
  "text-violet-700",
  "text-pink-700",
  "text-teal-700",
  "text-indigo-700",
];

function bindColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0;
  }
  return BIND_PALETTE[h % BIND_PALETTE.length] ?? BIND_PALETTE[0]!;
}

function ParamRow({
  name,
  entry,
  value,
  onChange,
}: {
  name: string;
  entry: ParamSchemaEntry;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[10px] text-indigo-700">{`{${name}}`}</span>
        <span className="text-[10px] uppercase tracking-wide text-zinc-400">
          {entry.kind}
        </span>
      </div>
      <ParamControl entry={entry} value={value} onChange={onChange} />
    </div>
  );
}

function ParamControl({
  entry,
  value,
  onChange,
}: {
  entry: ParamSchemaEntry;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const inputCls = "h-7 text-xs";

  switch (entry.kind) {
    case "string": {
      const v = typeof value === "string" ? value : (entry.default ?? "");
      return (
        <Input
          type="text"
          value={v}
          maxLength={entry.maxLen}
          onChange={(e) => onChange(e.target.value)}
          placeholder={entry.default}
          className={inputCls}
        />
      );
    }
    case "url": {
      const v = typeof value === "string" ? value : (entry.default ?? "");
      return (
        <Input
          type="url"
          value={v}
          onChange={(e) => onChange(e.target.value)}
          placeholder={entry.default}
          className={inputCls}
        />
      );
    }
    case "color": {
      const v =
        typeof value === "string" ? value : (entry.default ?? "#000000");
      return <ColorPicker value={v} onChange={onChange} label="Param color" />;
    }
    case "number": {
      const v = typeof value === "number" ? value : (entry.default ?? 0);
      return (
        <Input
          type="number"
          value={Number.isFinite(v) ? v : 0}
          min={entry.min}
          max={entry.max}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onChange(Number.isFinite(n) ? n : 0);
          }}
          className={inputCls}
        />
      );
    }
    case "boolean": {
      const v = typeof value === "boolean" ? value : (entry.default ?? false);
      return (
        <label className="flex h-7 items-center gap-2">
          <Checkbox checked={v} onCheckedChange={(c) => onChange(c === true)} />
          <span className="text-[11px] text-zinc-500">
            {v ? "true" : "false"}
          </span>
        </label>
      );
    }
    case "enum": {
      const v =
        typeof value === "string" && entry.values.includes(value)
          ? value
          : (entry.default ?? entry.values[0]);
      return (
        <Select value={v} onValueChange={(next) => onChange(next)}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {entry.values.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
  }
}

// Walks nodes + artboard for any { $param: name } reference (including those
// nested inside Paint stops/shadows). The filter is intentionally permissive —
// we don't care *where* a param is bound, only that it is.
function collectBoundParams(
  nodes: EditorNode[],
  artboard: Artboard,
): Set<string> {
  const out = new Set<string>();
  const visit = (v: unknown): void => {
    if (v === null || v === undefined) return;
    if (typeof v !== "object") return;
    if (isParamRef(v as never)) {
      out.add((v as { $param: string }).$param);
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v) visit(item);
      return;
    }
    for (const key of Object.keys(v)) {
      visit((v as Record<string, unknown>)[key]);
    }
  };
  visit(nodes);
  visit(artboard);
  return out;
}

function formatRelative(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const ms = Date.now() - date.getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
