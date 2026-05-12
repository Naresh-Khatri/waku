"use client";

import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import type { ChangeEvent } from "react";
import { useState } from "react";
import { useEditor } from "./store";
import type {
  Artboard,
  EditorNode,
  FontFamily,
  Paint,
  Shadow,
  Value,
} from "./types";
import { FONT_FAMILY_VALUES, isFlatPaint, isParamRef } from "./types";
import { useLazyFonts } from "./use-lazy-font";
import { ColorPicker } from "./color-picker";
import { PaintInput } from "./paint-picker";
import { Bindable } from "./bind-button";
import { AssetUploadError, useAssetUploader } from "./asset-upload";
import { AssetPickerButton } from "./asset-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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

export function Inspector() {
  const selectedId = useEditor((s) => s.selectedId);
  const node = useEditor((s) =>
    s.selectedId ? (s.nodes.find((n) => n.id === s.selectedId) ?? null) : null,
  );
  const setArtboard = useEditor((s) => s.setArtboard);
  const artboard = useEditor((s) => s.artboard);

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-md">
      <div className="flex h-9 items-center border-b border-zinc-200 px-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {selectedId ? "Inspect" : "Document"}
        </span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {node ? (
          <NodeInspector key={node.id} node={node} />
        ) : (
          <DocumentInspector
            artboard={artboard}
            onChange={(p) => setArtboard(p)}
          />
        )}
      </ScrollArea>
    </aside>
  );
}

function DocumentInspector({
  artboard,
  onChange,
}: {
  artboard: Artboard;
  onChange: (p: Partial<Artboard>) => void;
}) {
  return (
    <Section title="Artboard">
      <Row label="Width">
        <NumberInput
          value={artboard.width}
          onChange={(v) => onChange({ width: clampInt(v, 100, 4000) })}
        />
      </Row>
      <Row label="Height">
        <NumberInput
          value={artboard.height}
          onChange={(v) => onChange({ height: clampInt(v, 100, 4000) })}
        />
      </Row>
      <Row label="Background">
        <Bindable
          paint
          target={{ kind: "artboard" }}
          field="background"
          paramKind="color"
          value={artboard.background}
          fallback={{ kind: "flat", color: "#ffffff" }}
        >
          <PaintField
            value={artboard.background}
            onChange={(v) => onChange({ background: v })}
          />
        </Bindable>
      </Row>
    </Section>
  );
}

function NodeInspector({ node }: { node: EditorNode }) {
  const update = useEditor((s) => s.updateNode);
  const set = (patch: Partial<EditorNode>) => update(node.id, patch);

  return (
    <>
      <Section title="Layer">
        <Row label="Name">
          <TextInput value={node.name} onChange={(v) => set({ name: v })} />
        </Row>
      </Section>

      <Section title="Position">
        <PairRow>
          <NumberInput
            label="X"
            value={Math.round(node.x)}
            onChange={(v) => set({ x: v })}
          />
          <NumberInput
            label="Y"
            value={Math.round(node.y)}
            onChange={(v) => set({ y: v })}
          />
        </PairRow>
        <PairRow>
          <NumberInput
            label="W"
            value={Math.round(node.width)}
            onChange={(v) => set({ width: Math.max(1, v) })}
          />
          <NumberInput
            label="H"
            value={Math.round(node.height)}
            onChange={(v) => set({ height: Math.max(1, v) })}
          />
        </PairRow>
        <Row label="Rotation">
          <RangeInput
            min={-180}
            max={180}
            step={1}
            value={node.rotation}
            onChange={(v) => set({ rotation: v })}
          />
        </Row>
        <Row label="Opacity">
          <Bindable
            target={{ kind: "node", id: node.id }}
            field="opacity"
            paramKind="number"
            value={node.opacity}
            fallback={1}
          >
            <NumberValueField
              value={node.opacity}
              onChange={(v) => set({ opacity: v })}
              min={0}
              max={1}
              step={0.01}
            />
          </Bindable>
        </Row>
      </Section>

      <TypeSection node={node} />
    </>
  );
}

function TypeSection({ node }: { node: EditorNode }) {
  const update = useEditor((s) => s.updateNode);
  const set = (patch: Partial<EditorNode>) => update(node.id, patch);

  switch (node.type) {
    case "image": {
      const maxRadius = Math.min(node.width, node.height) / 2;
      return (
        <>
          <Section title="Image">
            <Row label="Source">
              <Bindable
                target={{ kind: "node", id: node.id }}
                field="src"
                paramKind="url"
                value={node.src}
                fallback=""
              >
                <TextInput value={node.src} onChange={(v) => set({ src: v })} />
              </Bindable>
            </Row>
            <ImageUploadRow
              disabled={isParamRef(node.src)}
              onUploaded={(src) => set({ src })}
            />
            <Row label="Library">
              <AssetPickerButton
                disabled={isParamRef(node.src)}
                onPick={(src) => set({ src })}
              />
            </Row>
            <Row label="Fit">
              <SelectInput
                value={node.fit}
                options={[
                  { value: "cover", label: "Cover" },
                  { value: "contain", label: "Contain" },
                ]}
                onChange={(v) => set({ fit: v as "cover" | "contain" })}
              />
            </Row>
            <Row label="Corner radius">
              <Bindable
                target={{ kind: "node", id: node.id }}
                field="cornerRadius"
                paramKind="number"
                value={node.cornerRadius}
                fallback={0}
              >
                <NumberValueField
                  min={0}
                  max={maxRadius}
                  step={1}
                  value={node.cornerRadius}
                  onChange={(v) => set({ cornerRadius: v })}
                />
              </Bindable>
            </Row>
          </Section>
          <Section title="Border">
            <Row label="Color">
              <Bindable
                paint
                target={{ kind: "node", id: node.id }}
                field="stroke"
                paramKind="color"
                value={node.stroke}
                fallback={{ kind: "flat", color: "#000000" }}
              >
                <PaintField
                  value={node.stroke}
                  onChange={(v) => set({ stroke: v })}
                />
              </Bindable>
            </Row>
            <Row label="Width">
              <Bindable
                target={{ kind: "node", id: node.id }}
                field="strokeWidth"
                paramKind="number"
                value={node.strokeWidth}
                fallback={0}
              >
                <NumberValueField
                  min={0}
                  max={32}
                  step={1}
                  value={node.strokeWidth}
                  onChange={(v) => set({ strokeWidth: v })}
                />
              </Bindable>
            </Row>
          </Section>
          <ShadowSection
            shadow={node.shadow ?? null}
            onChange={(s) => set({ shadow: s })}
          />
        </>
      );
    }

    case "text":
      return (
        <>
          <Section title="Text">
            <Row label="Content">
              <Bindable
                target={{ kind: "node", id: node.id }}
                field="text"
                paramKind="string"
                value={node.text}
                fallback=""
              >
                <TextAreaField
                  value={node.text}
                  onChange={(v) => set({ text: v })}
                />
              </Bindable>
            </Row>
            <Row label="Size">
              <Bindable
                target={{ kind: "node", id: node.id }}
                field="fontSize"
                paramKind="number"
                value={node.fontSize}
                fallback={48}
              >
                {isParamRef(node.fontSize) ? (
                  <BoundChip name={node.fontSize.$param} />
                ) : (
                  <NumberInput
                    value={node.fontSize}
                    onChange={(v) => set({ fontSize: Math.max(4, v) })}
                  />
                )}
              </Bindable>
            </Row>
            <Row label="Font">
              <FontFamilySelect
                value={node.fontFamily}
                onChange={(v) => set({ fontFamily: v })}
              />
            </Row>
            <Row label="Weight">
              <SelectInput
                value={String(node.fontWeight)}
                options={[
                  { value: "400", label: "Regular" },
                  { value: "500", label: "Medium" },
                  { value: "600", label: "Semi" },
                  { value: "700", label: "Bold" },
                  { value: "800", label: "Black" },
                ]}
                onChange={(v) =>
                  set({ fontWeight: Number(v) as 400 | 500 | 600 | 700 | 800 })
                }
              />
            </Row>
            <Row label="Italic">
              <Bindable
                target={{ kind: "node", id: node.id }}
                field="italic"
                paramKind="boolean"
                value={node.italic}
                fallback={false}
              >
                <BoolValueField
                  value={node.italic}
                  onChange={(v) => set({ italic: v })}
                />
              </Bindable>
            </Row>
            <Row label="Color">
              <Bindable
                paint
                target={{ kind: "node", id: node.id }}
                field="color"
                paramKind="color"
                value={node.color}
                fallback={{ kind: "flat", color: "#111111" }}
              >
                <PaintField
                  value={node.color}
                  onChange={(v) => set({ color: v })}
                />
              </Bindable>
            </Row>
            <Row label="Align">
              <div className="flex gap-1">
                <AlignBtn
                  active={node.align === "left"}
                  onClick={() => set({ align: "left" })}
                  aria-label="Align left"
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                </AlignBtn>
                <AlignBtn
                  active={node.align === "center"}
                  onClick={() => set({ align: "center" })}
                  aria-label="Align center"
                >
                  <AlignCenter className="h-3.5 w-3.5" />
                </AlignBtn>
                <AlignBtn
                  active={node.align === "right"}
                  onClick={() => set({ align: "right" })}
                  aria-label="Align right"
                >
                  <AlignRight className="h-3.5 w-3.5" />
                </AlignBtn>
              </div>
            </Row>
            <Row label="Line height">
              <Bindable
                target={{ kind: "node", id: node.id }}
                field="lineHeight"
                paramKind="number"
                value={node.lineHeight}
                fallback={1.2}
              >
                <NumberValueField
                  min={0.8}
                  max={2.4}
                  step={0.05}
                  value={node.lineHeight}
                  onChange={(v) => set({ lineHeight: v })}
                />
              </Bindable>
            </Row>
            <Row label="Tracking">
              <Bindable
                target={{ kind: "node", id: node.id }}
                field="letterSpacing"
                paramKind="number"
                value={node.letterSpacing}
                fallback={0}
              >
                <NumberValueField
                  min={-2}
                  max={20}
                  step={0.5}
                  value={node.letterSpacing}
                  onChange={(v) => set({ letterSpacing: v })}
                />
              </Bindable>
            </Row>
          </Section>
          <ShadowSection
            shadow={node.shadow ?? null}
            onChange={(s) => set({ shadow: s })}
          />
        </>
      );

    case "rectangle":
      return (
        <>
          <Section title="Rectangle">
            <Row label="Fill">
              <Bindable
                paint
                target={{ kind: "node", id: node.id }}
                field="fill"
                paramKind="color"
                value={node.fill}
                fallback={{ kind: "flat", color: "#6366f1" }}
              >
                <PaintField value={node.fill} onChange={(v) => set({ fill: v })} />
              </Bindable>
            </Row>
            <Row label="Stroke">
              <Bindable
                paint
                target={{ kind: "node", id: node.id }}
                field="stroke"
                paramKind="color"
                value={node.stroke}
                fallback={{ kind: "flat", color: "#000000" }}
              >
                <PaintField value={node.stroke} onChange={(v) => set({ stroke: v })} />
              </Bindable>
            </Row>
            <Row label="Stroke width">
              <Bindable
                target={{ kind: "node", id: node.id }}
                field="strokeWidth"
                paramKind="number"
                value={node.strokeWidth}
                fallback={0}
              >
                <NumberValueField
                  min={0}
                  max={32}
                  step={1}
                  value={node.strokeWidth}
                  onChange={(v) => set({ strokeWidth: v })}
                />
              </Bindable>
            </Row>
            <Row label="Corner radius">
              <Bindable
                target={{ kind: "node", id: node.id }}
                field="cornerRadius"
                paramKind="number"
                value={node.cornerRadius}
                fallback={0}
              >
                <NumberValueField
                  min={0}
                  max={Math.min(node.width, node.height) / 2}
                  step={1}
                  value={node.cornerRadius}
                  onChange={(v) => set({ cornerRadius: v })}
                />
              </Bindable>
            </Row>
          </Section>
          <ShadowSection
            shadow={node.shadow ?? null}
            onChange={(s) => set({ shadow: s })}
          />
        </>
      );

    case "ellipse":
    case "triangle":
      return (
        <>
          <Section title={node.type === "ellipse" ? "Ellipse" : "Triangle"}>
            <Row label="Fill">
              <Bindable
                paint
                target={{ kind: "node", id: node.id }}
                field="fill"
                paramKind="color"
                value={node.fill}
                fallback={{
                  kind: "flat",
                  color: node.type === "ellipse" ? "#ec4899" : "#10b981",
                }}
              >
                <PaintField value={node.fill} onChange={(v) => set({ fill: v })} />
              </Bindable>
            </Row>
            <Row label="Stroke">
              <Bindable
                paint
                target={{ kind: "node", id: node.id }}
                field="stroke"
                paramKind="color"
                value={node.stroke}
                fallback={{ kind: "flat", color: "#000000" }}
              >
                <PaintField value={node.stroke} onChange={(v) => set({ stroke: v })} />
              </Bindable>
            </Row>
            <Row label="Stroke width">
              <Bindable
                target={{ kind: "node", id: node.id }}
                field="strokeWidth"
                paramKind="number"
                value={node.strokeWidth}
                fallback={0}
              >
                <NumberValueField
                  min={0}
                  max={32}
                  step={1}
                  value={node.strokeWidth}
                  onChange={(v) => set({ strokeWidth: v })}
                />
              </Bindable>
            </Row>
          </Section>
          {node.type === "ellipse" ? (
            <ShadowSection
              shadow={node.shadow ?? null}
              onChange={(s) => set({ shadow: s })}
            />
          ) : null}
        </>
      );

    case "star":
      return (
        <Section title="Star">
          <Row label="Fill">
            <Bindable
              paint
              target={{ kind: "node", id: node.id }}
              field="fill"
              paramKind="color"
              value={node.fill}
              fallback={{ kind: "flat", color: "#f59e0b" }}
            >
              <PaintField value={node.fill} onChange={(v) => set({ fill: v })} />
            </Bindable>
          </Row>
          <Row label="Stroke">
            <Bindable
              paint
              target={{ kind: "node", id: node.id }}
              field="stroke"
              paramKind="color"
              value={node.stroke}
              fallback={{ kind: "flat", color: "#000000" }}
            >
              <PaintField value={node.stroke} onChange={(v) => set({ stroke: v })} />
            </Bindable>
          </Row>
          <Row label="Stroke width">
            <Bindable
              target={{ kind: "node", id: node.id }}
              field="strokeWidth"
              paramKind="number"
              value={node.strokeWidth}
              fallback={0}
            >
              <NumberValueField
                min={0}
                max={32}
                step={1}
                value={node.strokeWidth}
                onChange={(v) => set({ strokeWidth: v })}
              />
            </Bindable>
          </Row>
          <Row label="Points">
            <Bindable
              target={{ kind: "node", id: node.id }}
              field="points"
              paramKind="number"
              value={node.points}
              fallback={5}
            >
              <NumberValueField
                min={3}
                max={12}
                step={1}
                value={node.points}
                onChange={(v) => set({ points: Math.round(v) })}
              />
            </Bindable>
          </Row>
          <Row label="Inner ratio">
            <Bindable
              target={{ kind: "node", id: node.id }}
              field="innerRadiusRatio"
              paramKind="number"
              value={node.innerRadiusRatio}
              fallback={0.45}
            >
              <NumberValueField
                min={0.1}
                max={0.9}
                step={0.01}
                value={node.innerRadiusRatio}
                onChange={(v) => set({ innerRadiusRatio: v })}
              />
            </Bindable>
          </Row>
        </Section>
      );

    case "line":
      return (
        <Section title="Line">
          <Row label="Color">
            <Bindable
              paint
              target={{ kind: "node", id: node.id }}
              field="stroke"
              paramKind="color"
              value={node.stroke}
              fallback={{ kind: "flat", color: "#111111" }}
            >
              <PaintField value={node.stroke} onChange={(v) => set({ stroke: v })} />
            </Bindable>
          </Row>
          <Row label="Width">
            <Bindable
              target={{ kind: "node", id: node.id }}
              field="strokeWidth"
              paramKind="number"
              value={node.strokeWidth}
              fallback={4}
            >
              <NumberValueField
                min={1}
                max={32}
                step={1}
                value={node.strokeWidth}
                onChange={(v) => set({ strokeWidth: v })}
              />
            </Bindable>
          </Row>
          <Row label="Arrow">
            <Bindable
              target={{ kind: "node", id: node.id }}
              field="arrow"
              paramKind="boolean"
              value={node.arrow}
              fallback={false}
            >
              <BoolValueField
                value={node.arrow}
                onChange={(v) => set({ arrow: v })}
              />
            </Bindable>
          </Row>
        </Section>
      );
  }
}

function ShadowSection({
  shadow,
  onChange,
}: {
  shadow: Shadow | null;
  onChange: (s: Shadow | null) => void;
}) {
  const setField = (patch: Partial<Shadow>) => {
    const current: Shadow = shadow ?? {
      offsetX: 0,
      offsetY: 4,
      blur: 12,
      color: "#00000040",
    };
    onChange({ ...current, ...patch });
  };
  return (
    <Section title="Shadow">
      <Row label="Enabled">
        <Checkbox
          checked={shadow !== null}
          onCheckedChange={(checked) =>
            onChange(
              checked === true
                ? { offsetX: 0, offsetY: 4, blur: 12, color: "#00000040" }
                : null,
            )
          }
        />
      </Row>
      {shadow ? (
        <>
          <PairRow>
            <NumberInput
              label="X"
              value={shadow.offsetX}
              onChange={(v) => setField({ offsetX: v })}
            />
            <NumberInput
              label="Y"
              value={shadow.offsetY}
              onChange={(v) => setField({ offsetY: v })}
            />
          </PairRow>
          <Row label="Blur">
            <RangeInput
              min={0}
              max={100}
              step={1}
              value={shadow.blur}
              onChange={(v) => setField({ blur: v })}
            />
          </Row>
          <Row label="Color">
            <ColorInput
              value={shadow.color}
              onChange={(v) => setField({ color: v })}
            />
          </Row>
        </>
      ) : null}
    </Section>
  );
}

function ImageUploadRow({
  disabled,
  onUploaded,
}: {
  disabled: boolean;
  onUploaded: (src: string) => void;
}) {
  const { upload, isUploading } = useAssetUploader();
  const [error, setError] = useState<string | null>(null);

  const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    try {
      const { readUrl } = await upload(file);
      onUploaded(readUrl);
    } catch (err) {
      setError(
        err instanceof AssetUploadError
          ? err.message
          : "Upload failed. Try again.",
      );
    }
  };

  return (
    <>
      <Row label="Upload">
        <Input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          onChange={onChange}
          className="h-7 cursor-pointer text-xs"
          disabled={disabled || isUploading}
        />
      </Row>
      {isUploading ? (
        <Row label="">
          <span className="text-[11px] text-zinc-500">Uploading…</span>
        </Row>
      ) : null}
      {error ? (
        <Row label="">
          <span className="text-[11px] text-red-500">{error}</span>
        </Row>
      ) : null}
    </>
  );
}

function clampInt(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(v)));
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-3 py-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
      <Separator className="mt-3 -mx-3 w-auto" />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[11px] text-zinc-500">{label}</span>
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
    </div>
  );
}

function PairRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

const compactInput = "h-7 text-xs";

function NumberInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  return (
    <div className="flex w-full items-center gap-1">
      {label ? (
        <span className="w-4 text-[11px] text-zinc-400">{label}</span>
      ) : null}
      <Input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className={compactInput}
      />
    </div>
  );
}

function BoundChip({ name }: { name: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex h-7 w-full items-center rounded-md border border-indigo-200 bg-indigo-50 px-2 font-mono text-[11px] text-indigo-700">
          {`{${name}}`}
        </span>
      </TooltipTrigger>
      <TooltipContent>{`Bound to {${name}}`}</TooltipContent>
    </Tooltip>
  );
}

function TextInput({
  value,
  onChange,
}: {
  value: Value<string>;
  onChange: (v: string) => void;
}) {
  if (isParamRef(value)) return <BoundChip name={value.$param} />;
  return (
    <Input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={compactInput}
    />
  );
}

function TextAreaField({
  value,
  onChange,
}: {
  value: Value<string>;
  onChange: (v: string) => void;
}) {
  if (isParamRef(value)) return <BoundChip name={value.$param} />;
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className="min-h-[60px] text-xs"
    />
  );
}

function ColorInput({
  value,
  onChange,
  label,
}: {
  value: Value<string>;
  onChange: (v: string) => void;
  label?: string;
}) {
  if (isParamRef(value)) return <BoundChip name={value.$param} />;
  return <ColorPicker value={value} onChange={onChange} label={label} />;
}

function PaintField({
  value,
  onChange,
  label,
}: {
  value: Paint;
  onChange: (v: Paint) => void;
  label?: string;
}) {
  const bound =
    isFlatPaint(value) && isParamRef(value.color)
      ? { name: value.color.$param }
      : null;
  return (
    <PaintInput
      value={value}
      onChange={onChange}
      label={label}
      boundChip={bound}
    />
  );
}

function NumberValueField({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: Value<number>;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  if (isParamRef(value)) return <BoundChip name={value.$param} />;
  return (
    <RangeInput
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={onChange}
    />
  );
}

function BoolValueField({
  value,
  onChange,
}: {
  value: Value<boolean>;
  onChange: (v: boolean) => void;
}) {
  if (isParamRef(value)) return <BoundChip name={value.$param} />;
  return (
    <Switch
      checked={value}
      onCheckedChange={(checked) => onChange(checked === true)}
    />
  );
}

function RangeInput({
  min,
  max,
  step,
  value,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex w-full items-center gap-2">
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(v[0] ?? value)}
        className="flex-1"
      />
      <span className="w-10 text-right text-[11px] text-zinc-500">
        {Number.isInteger(step) ? Math.round(value) : value.toFixed(2)}
      </span>
    </div>
  );
}

function FontFamilySelect({
  value,
  onChange,
}: {
  value: FontFamily;
  onChange: (v: FontFamily) => void;
}) {
  const [hasOpened, setHasOpened] = useState(false);
  useLazyFonts(FONT_FAMILY_VALUES, { enabled: hasOpened });

  return (
    <div className="flex w-full items-center gap-1">
      <Select
        value={value}
        onValueChange={(v) => onChange(v as FontFamily)}
        onOpenChange={(o) => {
          if (o) setHasOpened(true);
        }}
      >
        <SelectTrigger size="sm" className="w-full text-xs">
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
                  <span style={{ fontFamily: `'${f}'`, fontSize: 13 }}>
                    {f}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SelectInput({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label?: string;
}) {
  return (
    <div className="flex w-full items-center gap-1">
      {label ? (
        <span className="w-12 text-[11px] text-zinc-400">{label}</span>
      ) : null}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger size="sm" className="w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function AlignBtn({
  active,
  onClick,
  children,
  ...props
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
} & React.ComponentProps<"button">) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      onClick={onClick}
      className={cn(
        active ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" : undefined,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
