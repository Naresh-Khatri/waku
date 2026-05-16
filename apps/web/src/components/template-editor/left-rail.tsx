"use client";

import {
  Circle,
  FileImage,
  Heart,
  Image as ImageIcon,
  LayoutGrid,
  Layers as LayersIcon,
  Minus,
  Redo2,
  Settings2,
  Square,
  Star,
  Triangle,
  Type,
  Undo2,
  Upload,
  Variable,
  Wand2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

import { AssetUploadError, useAssetUploader } from "./asset-upload";
import { useEditorConfig } from "./editor-config";
import { DocumentInspector } from "./inspector";
import { LayersList } from "./layers-panel";
import { useEditor } from "./store";
import type { NodeType } from "./types";
import { VariablesPanel } from "./variables-panel";

export type TabId =
  | "design"
  | "elements"
  | "text"
  | "uploads"
  | "layers"
  | "variables";

interface TabDef {
  id: TabId;
  label: string;
  icon: LucideIcon;
  /** Only render this tab when `enableParams` is true. */
  paramsOnly?: boolean;
}

export const TABS: TabDef[] = [
  { id: "elements", label: "Elements", icon: LayoutGrid },
  { id: "text", label: "Text", icon: Type },
  { id: "uploads", label: "Uploads", icon: FileImage },
  { id: "layers", label: "Layers", icon: LayersIcon },
  { id: "variables", label: "Variables", icon: Variable, paramsOnly: true },
  { id: "design", label: "Design", icon: Settings2 },
];

const FLYOUT_WIDTH = 300;

export function LeftRail() {
  const { enableParams } = useEditorConfig();
  const visibleTabs = useMemo(
    () => TABS.filter((t) => !t.paramsOnly || enableParams),
    [enableParams],
  );
  // Click pins a panel: it docks in-flow and pushes the canvas.
  // Hover floats a panel as an absolute overlay — no canvas shift.
  const [pinned, setPinned] = useState<TabId | null>("layers");
  const [hovered, setHovered] = useState<TabId | null>(null);
  const activeTab = pinned ?? hovered;
  const pinnedOpen = pinned != null;
  const floatOpen = pinned == null && hovered != null;

  // Keep the last rendered tab for each panel so content doesn't snap
  // away while it animates closed.
  const [lastPinnedTab, setLastPinnedTab] = useState<TabId>("layers");
  useEffect(() => {
    if (pinned) setLastPinnedTab(pinned);
  }, [pinned]);
  const [lastFloatTab, setLastFloatTab] = useState<TabId>("layers");
  useEffect(() => {
    if (floatOpen && hovered) setLastFloatTab(hovered);
  }, [floatOpen, hovered]);

  // Small grace period so moving the pointer from an icon to the floating
  // panel (and back) doesn't flicker it shut.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const openHover = (id: TabId) => {
    // Hover is disabled while a panel is pinned open.
    if (pinned != null) return;
    cancelClose();
    setHovered(id);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setHovered(null), 120);
  };
  useEffect(() => cancelClose, []);

  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);

  return (
    <div className="relative flex h-full min-h-0">
      <nav
        className="flex w-[68px] shrink-0 flex-col items-center gap-1 border-r border-zinc-200 bg-white py-2"
        onMouseLeave={scheduleClose}
      >
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setPinned((p) => (p === tab.id ? null : tab.id))
              }
              onMouseEnter={() => openHover(tab.id)}
              aria-pressed={pinned === tab.id}
              className={cn(
                "flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-md text-[10px] font-medium transition",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
        <div className="mt-auto flex flex-col items-center gap-0.5 pb-1">
          <Separator className="!my-1 w-8" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={undo}
                disabled={!canUndo}
                aria-label="Undo"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Undo (⌘Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={redo}
                disabled={!canRedo}
                aria-label="Redo"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Redo (⌘⇧Z)</TooltipContent>
          </Tooltip>
        </div>
      </nav>
      {/* Pinned: docks in-flow and pushes the canvas. */}
      <div
        aria-hidden={!pinnedOpen}
        className="overflow-hidden transition-[width] duration-200 ease-out"
        style={{ width: pinnedOpen ? FLYOUT_WIDTH : 0 }}
      >
        <Flyout tab={lastPinnedTab} floating={false} />
      </div>
      {/* Hover: floats as an overlay, never shifting the canvas. */}
      <div
        aria-hidden={!floatOpen}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        className={cn(
          "absolute left-full top-0 z-30 h-full p-2 transition-[opacity,transform] duration-150 ease-out",
          floatOpen
            ? "pointer-events-auto translate-x-0 opacity-100"
            : "pointer-events-none -translate-x-3 opacity-0",
        )}
        style={{ width: FLYOUT_WIDTH + 16 }}
      >
        <Flyout tab={lastFloatTab} floating />
      </div>
    </div>
  );
}

export function useVisibleTabs() {
  const { enableParams } = useEditorConfig();
  return useMemo(
    () => TABS.filter((t) => !t.paramsOnly || enableParams),
    [enableParams],
  );
}

/**
 * Mobile replacement for the desktop icon rail: a bottom tab bar that opens
 * the matching panel in a sheet, plus an always-visible undo/redo cluster.
 */
export function MobileBottomNav({
  activeTab,
  onTabPress,
}: {
  activeTab: TabId | null;
  onTabPress: (tab: TabId) => void;
}) {
  const visibleTabs = useVisibleTabs();
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);

  return (
    <nav className="flex h-14 shrink-0 items-stretch border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabPress(tab.id)}
              aria-pressed={isActive}
              className={cn(
                "flex min-w-[64px] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition",
                isActive
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-zinc-600 active:bg-zinc-100",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="flex shrink-0 items-center gap-0.5 border-l border-zinc-200 px-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={undo}
          disabled={!canUndo}
          aria-label="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={redo}
          disabled={!canRedo}
          aria-label="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}

function Flyout({ tab, floating }: { tab: TabId; floating: boolean }) {
  const tabDef = TABS.find((t) => t.id === tab);
  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-white",
        floating
          ? "overflow-hidden rounded-xl border border-zinc-200 shadow-2xl ring-1 ring-black/5"
          : "border-r border-zinc-200 shadow-md",
      )}
      style={{ width: FLYOUT_WIDTH }}
    >
      <div className="flex h-10 shrink-0 items-center border-b border-zinc-200 px-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {tabDef?.label ?? ""}
        </span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <PanelContent tab={tab} />
      </ScrollArea>
    </aside>
  );
}

export function PanelContent({ tab }: { tab: TabId }) {
  switch (tab) {
    case "design":
      return <DesignPanel />;
    case "elements":
      return <ElementsPanel />;
    case "text":
      return <TextPresetsPanel />;
    case "uploads":
      return <UploadsPanel />;
    case "layers":
      return <LayersList />;
    case "variables":
      return <VariablesPanel />;
  }
}

function DesignPanel() {
  const artboard = useEditor((s) => s.artboard);
  const setArtboard = useEditor((s) => s.setArtboard);
  return <DocumentInspector artboard={artboard} onChange={setArtboard} />;
}

const ELEMENT_ITEMS: { type: NodeType; icon: LucideIcon; label: string }[] = [
  { type: "rectangle", icon: Square, label: "Rectangle" },
  { type: "ellipse", icon: Circle, label: "Ellipse" },
  { type: "triangle", icon: Triangle, label: "Triangle" },
  { type: "star", icon: Star, label: "Star" },
  { type: "line", icon: Minus, label: "Line" },
  { type: "path", icon: Heart, label: "Path" },
  { type: "image", icon: ImageIcon, label: "Image" },
  { type: "text", icon: Type, label: "Text" },
];

function ElementsPanel() {
  const addNode = useEditor((s) => s.addNode);
  return (
    <div className="p-3">
      <div className="grid grid-cols-2 gap-2">
        {ELEMENT_ITEMS.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => addNode(type)}
            className="group flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            <Icon className="h-5 w-5" />
            <span className="text-[11px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface TextPreset {
  label: string;
  text: string;
  fontSize: number;
  fontWeight: 400 | 500 | 600 | 700 | 800;
  italic?: boolean;
  className: string;
}

const TEXT_PRESETS: TextPreset[] = [
  {
    label: "Heading",
    text: "Add a heading",
    fontSize: 72,
    fontWeight: 800,
    className: "text-2xl font-extrabold tracking-tight",
  },
  {
    label: "Subheading",
    text: "Add a subheading",
    fontSize: 40,
    fontWeight: 600,
    className: "text-lg font-semibold tracking-tight",
  },
  {
    label: "Body",
    text: "Add body text",
    fontSize: 18,
    fontWeight: 400,
    className: "text-sm",
  },
  {
    label: "Caption",
    text: "Add a caption",
    fontSize: 14,
    fontWeight: 500,
    italic: true,
    className: "text-xs italic text-zinc-500",
  },
];

function TextPresetsPanel() {
  const addNode = useEditor((s) => s.addNode);
  const updateNode = useEditor((s) => s.updateNode);

  const insert = (preset: TextPreset) => {
    addNode("text");
    const id = useEditor.getState().selectedId;
    if (!id) return;
    updateNode(id, {
      text: preset.text,
      fontSize: preset.fontSize,
      fontWeight: preset.fontWeight,
      italic: preset.italic ?? false,
    });
  };

  return (
    <div className="flex flex-col gap-2 p-3">
      <button
        type="button"
        onClick={() => addNode("text")}
        className="flex items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800"
      >
        <Wand2 className="h-3.5 w-3.5" />
        Add a text box
      </button>
      <div className="mt-2 flex flex-col gap-1.5">
        {TEXT_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => insert(preset)}
            className="flex flex-col items-start rounded-md border border-zinc-200 bg-white px-3 py-3 text-left text-zinc-800 transition hover:border-indigo-300 hover:bg-indigo-50"
          >
            <span
              className={cn("leading-tight text-zinc-900", preset.className)}
            >
              {preset.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const UPLOAD_ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";

function UploadsPanel() {
  const list = api.asset.list.useQuery({ kind: "image" });
  const items = list.data ?? [];
  const addNode = useEditor((s) => s.addNode);
  const updateNode = useEditor((s) => s.updateNode);
  const { upload, isUploading } = useAssetUploader();
  const [error, setError] = useState<string | null>(null);

  const insertWithSrc = (src: string) => {
    addNode("image");
    const id = useEditor.getState().selectedId;
    if (id) updateNode(id, { src });
  };

  const uploadFile = async (file: File) => {
    setError(null);
    try {
      const { readUrl } = await upload(file);
      insertWithSrc(readUrl);
    } catch (err) {
      setError(
        err instanceof AssetUploadError
          ? err.message
          : "Upload failed. Try again.",
      );
    }
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-zinc-300 bg-zinc-50 px-3 py-4 text-zinc-500 transition hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700">
        <Upload className="h-4 w-4" />
        <span className="text-[11px] font-medium">
          {isUploading ? "Uploading…" : "Upload image"}
        </span>
        <input
          type="file"
          accept={UPLOAD_ACCEPT}
          className="hidden"
          disabled={isUploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void uploadFile(file);
          }}
        />
      </label>
      {error ? <p className="text-[11px] text-rose-600">{error}</p> : null}
      {list.isPending ? (
        <p className="text-xs text-zinc-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-zinc-500">No uploads yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {items.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => insertWithSrc(a.readUrl)}
              className="group block aspect-square overflow-hidden rounded-md border border-zinc-200 bg-zinc-50 hover:border-indigo-400"
              title={a.storageKey}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={a.readUrl}
                alt=""
                className="block h-full w-full object-cover transition group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
