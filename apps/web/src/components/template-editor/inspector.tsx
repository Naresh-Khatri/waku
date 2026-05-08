"use client";

import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import type { ChangeEvent } from "react";
import { useState } from "react";
import { useEditor } from "./store";
import type { Artboard, EditorNode, Paint, Shadow, Value } from "./types";
import { isFlatPaint, isParamRef } from "./types";
import { ColorPicker } from "./color-picker";
import { PaintInput } from "./paint-picker";
import { BindButton } from "./bind-button";
import { AssetUploadError, useAssetUploader } from "./asset-upload";
import { AssetPickerButton } from "./asset-picker";

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
      <div className="min-h-0 flex-1 overflow-y-auto">
        {node ? (
          <NodeInspector key={node.id} node={node} />
        ) : (
          <DocumentInspector
            artboard={artboard}
            onChange={(p) => setArtboard(p)}
          />
        )}
      </div>
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
        <PaintField
          value={artboard.background}
          onChange={(v) => onChange({ background: v })}
        />
        <BindButton
          paint
          target={{ kind: "artboard" }}
          field="background"
          paramKind="color"
          value={artboard.background}
          fallback={{ kind: "flat", color: "#ffffff" }}
        />
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
          <TextInput
            value={node.name}
            onChange={(v) => set({ name: v })}
          />
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
          <NumberValueField
            value={node.opacity}
            onChange={(v) => set({ opacity: v })}
            min={0}
            max={1}
            step={0.01}
          />
          <BindButton
            target={{ kind: "node", id: node.id }}
            field="opacity"
            paramKind="number"
            value={node.opacity}
            fallback={1}
          />
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
              <TextInput value={node.src} onChange={(v) => set({ src: v })} />
              <BindButton
                target={{ kind: "node", id: node.id }}
                field="src"
                paramKind="url"
                value={node.src}
                fallback=""
              />
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
              <NumberValueField
                min={0}
                max={maxRadius}
                step={1}
                value={node.cornerRadius}
                onChange={(v) => set({ cornerRadius: v })}
              />
              <BindButton
                target={{ kind: "node", id: node.id }}
                field="cornerRadius"
                paramKind="number"
                value={node.cornerRadius}
                fallback={0}
              />
            </Row>
          </Section>
          <Section title="Border">
            <Row label="Color">
              <PaintField
                value={node.stroke}
                onChange={(v) => set({ stroke: v })}
              />
              <BindButton
                paint
                target={{ kind: "node", id: node.id }}
                field="stroke"
                paramKind="color"
                value={node.stroke}
                fallback={{ kind: "flat", color: "#000000" }}
              />
            </Row>
            <Row label="Width">
              <NumberValueField
                min={0}
                max={32}
                step={1}
                value={node.strokeWidth}
                onChange={(v) => set({ strokeWidth: v })}
              />
              <BindButton
                target={{ kind: "node", id: node.id }}
                field="strokeWidth"
                paramKind="number"
                value={node.strokeWidth}
                fallback={0}
              />
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
            <TextArea value={node.text} onChange={(v) => set({ text: v })} />
            <BindButton
              target={{ kind: "node", id: node.id }}
              field="text"
              paramKind="string"
              value={node.text}
              fallback=""
            />
          </Row>
          <Row label="Size">
            {isParamRef(node.fontSize) ? (
              <BoundChip name={node.fontSize.$param} />
            ) : (
              <NumberInput
                value={node.fontSize}
                onChange={(v) => set({ fontSize: Math.max(4, v) })}
              />
            )}
            <BindButton
              target={{ kind: "node", id: node.id }}
              field="fontSize"
              paramKind="number"
              value={node.fontSize}
              fallback={48}
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
            <BoolValueField
              value={node.italic}
              onChange={(v) => set({ italic: v })}
            />
            <BindButton
              target={{ kind: "node", id: node.id }}
              field="italic"
              paramKind="boolean"
              value={node.italic}
              fallback={false}
            />
          </Row>
          <Row label="Color">
            <PaintField
              value={node.color}
              onChange={(v) => set({ color: v })}
            />
            <BindButton
              paint
              target={{ kind: "node", id: node.id }}
              field="color"
              paramKind="color"
              value={node.color}
              fallback={{ kind: "flat", color: "#111111" }}
            />
          </Row>
          <Row label="Align">
            <div className="flex gap-1">
              <AlignBtn
                active={node.align === "left"}
                onClick={() => set({ align: "left" })}
              >
                <AlignLeft className="h-3.5 w-3.5" />
              </AlignBtn>
              <AlignBtn
                active={node.align === "center"}
                onClick={() => set({ align: "center" })}
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </AlignBtn>
              <AlignBtn
                active={node.align === "right"}
                onClick={() => set({ align: "right" })}
              >
                <AlignRight className="h-3.5 w-3.5" />
              </AlignBtn>
            </div>
          </Row>
          <Row label="Line height">
            <NumberValueField
              min={0.8}
              max={2.4}
              step={0.05}
              value={node.lineHeight}
              onChange={(v) => set({ lineHeight: v })}
            />
            <BindButton
              target={{ kind: "node", id: node.id }}
              field="lineHeight"
              paramKind="number"
              value={node.lineHeight}
              fallback={1.2}
            />
          </Row>
          <Row label="Tracking">
            <NumberValueField
              min={-2}
              max={20}
              step={0.5}
              value={node.letterSpacing}
              onChange={(v) => set({ letterSpacing: v })}
            />
            <BindButton
              target={{ kind: "node", id: node.id }}
              field="letterSpacing"
              paramKind="number"
              value={node.letterSpacing}
              fallback={0}
            />
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
            <PaintField value={node.fill} onChange={(v) => set({ fill: v })} />
            <BindButton
              paint
              target={{ kind: "node", id: node.id }}
              field="fill"
              paramKind="color"
              value={node.fill}
              fallback={{ kind: "flat", color: "#6366f1" }}
            />
          </Row>
          <Row label="Stroke">
            <PaintField value={node.stroke} onChange={(v) => set({ stroke: v })} />
            <BindButton
              paint
              target={{ kind: "node", id: node.id }}
              field="stroke"
              paramKind="color"
              value={node.stroke}
              fallback={{ kind: "flat", color: "#000000" }}
            />
          </Row>
          <Row label="Stroke width">
            <NumberValueField
              min={0}
              max={32}
              step={1}
              value={node.strokeWidth}
              onChange={(v) => set({ strokeWidth: v })}
            />
            <BindButton
              target={{ kind: "node", id: node.id }}
              field="strokeWidth"
              paramKind="number"
              value={node.strokeWidth}
              fallback={0}
            />
          </Row>
          <Row label="Corner radius">
            <NumberValueField
              min={0}
              max={Math.min(node.width, node.height) / 2}
              step={1}
              value={node.cornerRadius}
              onChange={(v) => set({ cornerRadius: v })}
            />
            <BindButton
              target={{ kind: "node", id: node.id }}
              field="cornerRadius"
              paramKind="number"
              value={node.cornerRadius}
              fallback={0}
            />
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
            <PaintField value={node.fill} onChange={(v) => set({ fill: v })} />
            <BindButton
              paint
              target={{ kind: "node", id: node.id }}
              field="fill"
              paramKind="color"
              value={node.fill}
              fallback={{
                kind: "flat",
                color: node.type === "ellipse" ? "#ec4899" : "#10b981",
              }}
            />
          </Row>
          <Row label="Stroke">
            <PaintField value={node.stroke} onChange={(v) => set({ stroke: v })} />
            <BindButton
              paint
              target={{ kind: "node", id: node.id }}
              field="stroke"
              paramKind="color"
              value={node.stroke}
              fallback={{ kind: "flat", color: "#000000" }}
            />
          </Row>
          <Row label="Stroke width">
            <NumberValueField
              min={0}
              max={32}
              step={1}
              value={node.strokeWidth}
              onChange={(v) => set({ strokeWidth: v })}
            />
            <BindButton
              target={{ kind: "node", id: node.id }}
              field="strokeWidth"
              paramKind="number"
              value={node.strokeWidth}
              fallback={0}
            />
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
            <PaintField value={node.fill} onChange={(v) => set({ fill: v })} />
            <BindButton
              paint
              target={{ kind: "node", id: node.id }}
              field="fill"
              paramKind="color"
              value={node.fill}
              fallback={{ kind: "flat", color: "#f59e0b" }}
            />
          </Row>
          <Row label="Stroke">
            <PaintField value={node.stroke} onChange={(v) => set({ stroke: v })} />
            <BindButton
              paint
              target={{ kind: "node", id: node.id }}
              field="stroke"
              paramKind="color"
              value={node.stroke}
              fallback={{ kind: "flat", color: "#000000" }}
            />
          </Row>
          <Row label="Stroke width">
            <NumberValueField
              min={0}
              max={32}
              step={1}
              value={node.strokeWidth}
              onChange={(v) => set({ strokeWidth: v })}
            />
            <BindButton
              target={{ kind: "node", id: node.id }}
              field="strokeWidth"
              paramKind="number"
              value={node.strokeWidth}
              fallback={0}
            />
          </Row>
          <Row label="Points">
            <NumberValueField
              min={3}
              max={12}
              step={1}
              value={node.points}
              onChange={(v) => set({ points: Math.round(v) })}
            />
            <BindButton
              target={{ kind: "node", id: node.id }}
              field="points"
              paramKind="number"
              value={node.points}
              fallback={5}
            />
          </Row>
          <Row label="Inner ratio">
            <NumberValueField
              min={0.1}
              max={0.9}
              step={0.01}
              value={node.innerRadiusRatio}
              onChange={(v) => set({ innerRadiusRatio: v })}
            />
            <BindButton
              target={{ kind: "node", id: node.id }}
              field="innerRadiusRatio"
              paramKind="number"
              value={node.innerRadiusRatio}
              fallback={0.45}
            />
          </Row>
        </Section>
      );

    case "line":
      return (
        <Section title="Line">
          <Row label="Color">
            <PaintField value={node.stroke} onChange={(v) => set({ stroke: v })} />
            <BindButton
              paint
              target={{ kind: "node", id: node.id }}
              field="stroke"
              paramKind="color"
              value={node.stroke}
              fallback={{ kind: "flat", color: "#111111" }}
            />
          </Row>
          <Row label="Width">
            <NumberValueField
              min={1}
              max={32}
              step={1}
              value={node.strokeWidth}
              onChange={(v) => set({ strokeWidth: v })}
            />
            <BindButton
              target={{ kind: "node", id: node.id }}
              field="strokeWidth"
              paramKind="number"
              value={node.strokeWidth}
              fallback={4}
            />
          </Row>
          <Row label="Arrow">
            <BoolValueField
              value={node.arrow}
              onChange={(v) => set({ arrow: v })}
            />
            <BindButton
              target={{ kind: "node", id: node.id }}
              field="arrow"
              paramKind="boolean"
              value={node.arrow}
              fallback={false}
            />
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
        <input
          type="checkbox"
          checked={shadow !== null}
          onChange={(e) =>
            onChange(
              e.target.checked
                ? {
                    offsetX: 0,
                    offsetY: 4,
                    blur: 12,
                    color: "#00000040",
                  }
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
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          onChange={onChange}
          className="text-xs text-zinc-600"
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
    <div className="border-b border-zinc-100 px-3 py-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[11px] text-zinc-500">{label}</span>
      <div className="flex flex-1 items-center">{children}</div>
    </div>
  );
}

function PairRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function inputClass() {
  return "h-7 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-800 outline-none focus:border-indigo-400";
}

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
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className={inputClass()}
      />
    </div>
  );
}

function BoundChip({ name }: { name: string }) {
  return (
    <span
      title={`Bound to {${name}}`}
      className="flex h-7 w-full items-center rounded-md border border-indigo-200 bg-indigo-50 px-2 font-mono text-[11px] text-indigo-700"
    >
      {`{${name}}`}
    </span>
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
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass()}
    />
  );
}

function TextArea({
  value,
  onChange,
}: {
  value: Value<string>;
  onChange: (v: string) => void;
}) {
  if (isParamRef(value)) return <BoundChip name={value.$param} />;
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className="min-h-[60px] w-full rounded-md border border-zinc-200 bg-white p-2 text-xs text-zinc-800 outline-none focus:border-indigo-400"
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
    <input
      type="checkbox"
      checked={value}
      onChange={(e) => onChange(e.target.checked)}
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
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-indigo-500"
      />
      <span className="w-10 text-right text-[11px] text-zinc-500">
        {Number.isInteger(step) ? Math.round(value) : value.toFixed(2)}
      </span>
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
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass()}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function AlignBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md ${
        active
          ? "bg-indigo-50 text-indigo-700"
          : "text-zinc-600 hover:bg-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}
