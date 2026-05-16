"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Copy,
  Italic,
  MoveRight,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { Bindable } from "./bind-button";
import { NodeInspector } from "./inspector";
import { PaintInput } from "./paint-picker";
import { useEditor } from "./store";
import type { EditorNode, FontFamily, ParamKind, Paint } from "./types";
import { FONT_FAMILY_VALUES, isParamRef } from "./types";
import { useLazyFonts } from "./use-lazy-font";

const BAR_HEIGHT = 44;

type FontCategory = "Sans" | "Serif" | "Display" | "Mono" | "Handwriting";

const FONT_FAMILY_CATEGORY: Record<FontFamily, FontCategory> = {
  Inter: "Sans",
  "Space Grotesk": "Sans",
  Roboto: "Sans",
  "Open Sans": "Sans",
  Montserrat: "Sans",
  Poppins: "Sans",
  "DM Sans": "Sans",
  Manrope: "Sans",
  "Plus Jakarta Sans": "Sans",
  "Work Sans": "Sans",
  "Playfair Display": "Serif",
  Merriweather: "Serif",
  Lora: "Serif",
  "DM Serif Display": "Serif",
  "Cormorant Garamond": "Serif",
  "Libre Baskerville": "Serif",
  "Bebas Neue": "Display",
  Anton: "Display",
  "Archivo Black": "Display",
  "JetBrains Mono": "Mono",
  "Fira Code": "Mono",
  "IBM Plex Mono": "Mono",
  "Space Mono": "Mono",
  Caveat: "Handwriting",
  Pacifico: "Handwriting",
};

const CATEGORY_ORDER: Record<FontCategory, number> = {
  Sans: 0,
  Serif: 1,
  Display: 2,
  Mono: 3,
  Handwriting: 4,
};

const FONT_FAMILY_GROUPS: { category: FontCategory; fonts: FontFamily[] }[] =
  (() => {
    const buckets = new Map<FontCategory, FontFamily[]>();
    for (const f of FONT_FAMILY_VALUES) {
      const c = FONT_FAMILY_CATEGORY[f];
      const list = buckets.get(c) ?? [];
      list.push(f);
      buckets.set(c, list);
    }
    return (Object.keys(CATEGORY_ORDER) as FontCategory[])
      .sort((a, b) => CATEGORY_ORDER[a] - CATEGORY_ORDER[b])
      .filter((c) => buckets.has(c))
      .map((category) => ({ category, fonts: buckets.get(category) ?? [] }));
  })();

export function ContextualBar() {
  const node = useEditor((s) =>
    s.selectedId ? (s.nodes.find((n) => n.id === s.selectedId) ?? null) : null,
  );

  if (!node) return null;

  return (
    <div className="flex justify-center pt-3">
      <div
        data-tour="contextual-bar"
        className="pointer-events-auto inline-flex max-w-[calc(100%-24px)] items-center gap-1 rounded-xl border border-zinc-200 bg-white px-2 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]"
        style={{ height: BAR_HEIGHT }}
      >
        <BarContent node={node} />
      </div>
    </div>
  );
}

export function BarContent({
  node,
  mode = "desktop",
}: {
  node: EditorNode;
  mode?: "desktop" | "mobile";
}) {
  return (
    <div className="flex h-full items-center gap-1">
      <TypeControls node={node} />
      <Divider />
      {mode === "mobile" ? (
        <MobileMoreButton node={node} />
      ) : (
        <MoreButton node={node} />
      )}
    </div>
  );
}

function TypeControls({ node }: { node: EditorNode }) {
  const update = useEditor((s) => s.updateNode);
  const set = (patch: Partial<EditorNode>) => update(node.id, patch);

  switch (node.type) {
    case "text":
      return (
        <>
          <FontFamilyPicker
            value={node.fontFamily}
            onChange={(v) => set({ fontFamily: v })}
          />
          <NumberCell
            label="Size"
            value={node.fontSize}
            min={4}
            max={400}
            onChange={(v) => set({ fontSize: v })}
            width={64}
          />
          <WeightPicker
            value={node.fontWeight}
            onChange={(v) => set({ fontWeight: v })}
          />
          <Divider />
          <ToggleBtn
            active={node.fontWeight >= 700}
            onClick={() =>
              set({ fontWeight: node.fontWeight >= 700 ? 400 : 700 })
            }
            label="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </ToggleBtn>
          <ToggleBtn
            active={node.italic}
            onClick={() => set({ italic: !node.italic })}
            label="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </ToggleBtn>
          <Divider />
          <BindablePaintCell
            nodeId={node.id}
            field="color"
            value={node.color}
            onChange={(v) => set({ color: v })}
            label="Text color"
            fallback={{ kind: "flat", color: "#111111" }}
          />
          <Divider />
          <ToggleBtn
            active={node.align === "left"}
            onClick={() => set({ align: "left" })}
            label="Align left"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </ToggleBtn>
          <ToggleBtn
            active={node.align === "center"}
            onClick={() => set({ align: "center" })}
            label="Align center"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </ToggleBtn>
          <ToggleBtn
            active={node.align === "right"}
            onClick={() => set({ align: "right" })}
            label="Align right"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </ToggleBtn>
        </>
      );
    case "image": {
      const maxRadius = Math.min(node.width, node.height) / 2;
      return (
        <>
          <ReplaceImageButton node={node} />
          <Divider />
          <FitPicker value={node.fit} onChange={(v) => set({ fit: v })} />
          <Divider />
          <NumberCell
            label="Radius"
            value={Math.round(node.cornerRadius)}
            min={0}
            max={maxRadius}
            onChange={(v) => set({ cornerRadius: v })}
            width={72}
          />
        </>
      );
    }
    case "rectangle":
    case "ellipse":
    case "triangle":
    case "star":
    case "path": {
      const fillFallback =
        node.type === "rectangle"
          ? "#6366f1"
          : node.type === "ellipse"
            ? "#ec4899"
            : node.type === "triangle"
              ? "#10b981"
              : node.type === "star"
                ? "#f59e0b"
                : "#ef4444";
      return (
        <>
          <PaintCellWithLabel
            nodeId={node.id}
            field="fill"
            label="Fill"
            value={node.fill}
            onChange={(v) => set({ fill: v })}
            fallback={{ kind: "flat", color: fillFallback }}
          />
          <Divider />
          <PaintCellWithLabel
            nodeId={node.id}
            field="stroke"
            label="Stroke"
            value={node.stroke}
            onChange={(v) => set({ stroke: v })}
            fallback={{ kind: "flat", color: "#000000" }}
          />
          <NumberCell
            label="W"
            value={Math.round(node.strokeWidth)}
            min={0}
            max={64}
            onChange={(v) => set({ strokeWidth: v })}
            width={56}
          />
          {node.type === "rectangle" ? (
            <>
              <Divider />
              <NumberCell
                label="Radius"
                value={Math.round(node.cornerRadius)}
                min={0}
                max={Math.min(node.width, node.height) / 2}
                onChange={(v) => set({ cornerRadius: v })}
                width={72}
              />
            </>
          ) : null}
          {node.type === "star" ? (
            <>
              <Divider />
              <NumberCell
                label="Points"
                value={node.points}
                min={3}
                max={24}
                onChange={(v) => set({ points: v })}
                width={64}
              />
            </>
          ) : null}
        </>
      );
    }
    case "line":
      return (
        <>
          <PaintCellWithLabel
            nodeId={node.id}
            field="stroke"
            label="Color"
            value={node.stroke}
            onChange={(v) => set({ stroke: v })}
            fallback={{ kind: "flat", color: "#111111" }}
          />
          <NumberCell
            label="W"
            value={Math.round(node.strokeWidth)}
            min={0}
            max={64}
            onChange={(v) => set({ strokeWidth: v })}
            width={56}
          />
          <Divider />
          <ToggleBtn
            active={node.arrow}
            onClick={() => set({ arrow: !node.arrow })}
            label="Arrow"
          >
            <MoveRight className="h-3.5 w-3.5" />
          </ToggleBtn>
        </>
      );
  }
}

function FontFamilyPicker({
  value,
  onChange,
}: {
  value: FontFamily;
  onChange: (v: FontFamily) => void;
}) {
  const [hasOpened, setHasOpened] = useState(false);
  useLazyFonts(FONT_FAMILY_VALUES, { enabled: hasOpened });
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as FontFamily)}
      onOpenChange={(o) => o && setHasOpened(true)}
    >
      <SelectTrigger size="sm" className="h-8 w-[160px] text-xs">
        <SelectValue>
          <span style={{ fontFamily: `'${value}'` }}>{value}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-72">
        {FONT_FAMILY_GROUPS.map((g, i) => (
          <SelectGroup key={g.category}>
            {i > 0 ? <SelectSeparator /> : null}
            <SelectLabel className="text-[10px] uppercase tracking-wide text-zinc-400">
              {g.category}
            </SelectLabel>
            {g.fonts.map((f) => (
              <SelectItem key={f} value={f} className="text-xs">
                <span style={{ fontFamily: `'${f}'`, fontSize: 13 }}>{f}</span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

const WEIGHTS: { value: 400 | 500 | 600 | 700 | 800; label: string }[] = [
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
  { value: 600, label: "Semibold" },
  { value: 700, label: "Bold" },
  { value: 800, label: "Extrabold" },
];

function WeightPicker({
  value,
  onChange,
}: {
  value: 400 | 500 | 600 | 700 | 800;
  onChange: (v: 400 | 500 | 600 | 700 | 800) => void;
}) {
  return (
    <Select
      value={String(value)}
      onValueChange={(v) =>
        onChange(parseInt(v, 10) as 400 | 500 | 600 | 700 | 800)
      }
    >
      <SelectTrigger size="sm" className="h-8 w-[112px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {WEIGHTS.map((w) => (
          <SelectItem key={w.value} value={String(w.value)} className="text-xs">
            {w.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FitPicker({
  value,
  onChange,
}: {
  value: "cover" | "contain";
  onChange: (v: "cover" | "contain") => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as "cover" | "contain")}
    >
      <SelectTrigger size="sm" className="h-8 w-[100px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="cover" className="text-xs">
          Cover
        </SelectItem>
        <SelectItem value="contain" className="text-xs">
          Contain
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

function NumberCell({
  label,
  value,
  min,
  max,
  onChange,
  width,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  width: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] uppercase tracking-wide text-zinc-400">
        {label}
      </span>
      <Input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (!Number.isFinite(n)) return;
          onChange(Math.max(min, Math.min(max, n)));
        }}
        className="h-8 px-2 py-0 text-xs"
        style={{ width }}
      />
    </div>
  );
}

function BindablePaintCell({
  nodeId,
  field,
  value,
  onChange,
  label,
  fallback,
  paramKind = "color",
}: {
  nodeId: string;
  field: string;
  value: Paint;
  onChange: (v: Paint) => void;
  label: string;
  fallback: Paint;
  paramKind?: ParamKind;
}) {
  return (
    <Bindable
      paint
      target={{ kind: "node", id: nodeId }}
      field={field}
      paramKind={paramKind}
      value={value}
      fallback={fallback}
    >
      <PaintInput compact value={value} onChange={onChange} label={label} />
    </Bindable>
  );
}

function PaintCellWithLabel({
  nodeId,
  field,
  value,
  onChange,
  label,
  fallback,
}: {
  nodeId: string;
  field: string;
  value: Paint;
  onChange: (v: Paint) => void;
  label: string;
  fallback: Paint;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] uppercase tracking-wide text-zinc-400">
        {label}
      </span>
      <BindablePaintCell
        nodeId={nodeId}
        field={field}
        value={value}
        onChange={onChange}
        label={label}
        fallback={fallback}
      />
    </div>
  );
}

function ReplaceImageButton({
  node,
}: {
  node: EditorNode & { type: "image" };
}) {
  const update = useEditor((s) => s.updateNode);
  return (
    <Bindable
      target={{ kind: "node", id: node.id }}
      field="src"
      paramKind="string"
      value={node.src}
      fallback=""
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs"
        onClick={() => {
          const current = isParamRef(node.src) ? "" : node.src;
          const url = window.prompt("Image URL", current);
          if (url) update(node.id, { src: url });
        }}
      >
        Replace image
      </Button>
    </Bindable>
  );
}

function ToggleBtn({
  children,
  onClick,
  label,
  active,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={active ? "secondary" : "ghost"}
          size="icon-sm"
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className={cn(
            active && "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Divider() {
  return <Separator orientation="vertical" className="mx-1" />;
}

function MoreButton({ node }: { node: EditorNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-zinc-600"
          aria-label="More options"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          More
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="max-h-[70vh] w-[320px] overflow-hidden p-0"
      >
        <div className="flex h-9 items-center border-b border-zinc-200 px-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {node.name}
          </span>
        </div>
        <ScrollArea className="max-h-[60vh]">
          <NodeInspector node={node} />
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function MobileMoreButton({ node }: { node: EditorNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-zinc-600"
          aria-label="More options"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          More
        </Button>
      </DrawerTrigger>
      <DrawerContent aria-describedby={undefined}>
        <DrawerTitle>{node.name}</DrawerTitle>
        <DrawerBody>
          <NodeInspector node={node} />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Mobile selection bar: a horizontally-scrollable strip of the same
 * `BarContent` controls, with a fixed Duplicate/Delete cluster on the right.
 * Renders nothing when no node is selected.
 */
export function MobileContextualBar() {
  const node = useEditor((s) =>
    s.selectedId ? (s.nodes.find((n) => n.id === s.selectedId) ?? null) : null,
  );
  const duplicate = useEditor((s) => s.duplicate);
  const removeNode = useEditor((s) => s.removeNode);

  if (!node) return null;

  return (
    <div className="flex shrink-0 items-stretch border-t border-zinc-200 bg-white">
      <div className="min-w-0 flex-1 overflow-x-auto overscroll-x-contain">
        <div className="flex h-11 min-w-max items-center gap-1 px-3">
          <BarContent node={node} mode="mobile" />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 border-l border-zinc-200 px-1.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => duplicate(node.id)}
          aria-label="Duplicate"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => removeNode(node.id)}
          aria-label="Delete"
          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
