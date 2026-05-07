"use client";

import { AlignCenter, AlignLeft, AlignRight } from "lucide-react";
import type { ChangeEvent } from "react";
import { useEditor } from "./store";
import type { Artboard, EditorNode, Value } from "./types";
import { isParamRef } from "./types";
import { ColorPicker } from "./color-picker";

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
        <ColorInput
          value={artboard.background}
          onChange={(v) => onChange({ background: v })}
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
          <RangeInput
            min={0}
            max={1}
            step={0.01}
            value={node.opacity}
            onChange={(v) => set({ opacity: v })}
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
    case "image":
      return (
        <Section title="Image">
          <Row label="Source">
            <TextInput value={node.src} onChange={(v) => set({ src: v })} />
          </Row>
          <Row label="Upload">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onUpload(e, (src) => set({ src }))}
              className="text-xs text-zinc-600"
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
        </Section>
      );

    case "text":
      return (
        <Section title="Text">
          <Row label="Content">
            <TextArea value={node.text} onChange={(v) => set({ text: v })} />
          </Row>
          <PairRow>
            <NumberInput
              label="Size"
              value={node.fontSize}
              onChange={(v) => set({ fontSize: Math.max(4, v) })}
            />
            <SelectInput
              label="Weight"
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
          </PairRow>
          <Row label="Color">
            <ColorInput value={node.color} onChange={(v) => set({ color: v })} />
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
            <RangeInput
              min={0.8}
              max={2.4}
              step={0.05}
              value={node.lineHeight}
              onChange={(v) => set({ lineHeight: v })}
            />
          </Row>
          <Row label="Tracking">
            <RangeInput
              min={-2}
              max={20}
              step={0.5}
              value={node.letterSpacing}
              onChange={(v) => set({ letterSpacing: v })}
            />
          </Row>
        </Section>
      );

    case "rectangle":
      return (
        <Section title="Rectangle">
          <Row label="Fill">
            <ColorInput value={node.fill} onChange={(v) => set({ fill: v })} />
          </Row>
          <Row label="Stroke">
            <ColorInput value={node.stroke} onChange={(v) => set({ stroke: v })} />
          </Row>
          <Row label="Stroke width">
            <RangeInput
              min={0}
              max={32}
              step={1}
              value={node.strokeWidth}
              onChange={(v) => set({ strokeWidth: v })}
            />
          </Row>
          <Row label="Corner radius">
            <RangeInput
              min={0}
              max={Math.min(node.width, node.height) / 2}
              step={1}
              value={node.cornerRadius}
              onChange={(v) => set({ cornerRadius: v })}
            />
          </Row>
        </Section>
      );

    case "ellipse":
    case "triangle":
      return (
        <Section title={node.type === "ellipse" ? "Ellipse" : "Triangle"}>
          <Row label="Fill">
            <ColorInput value={node.fill} onChange={(v) => set({ fill: v })} />
          </Row>
          <Row label="Stroke">
            <ColorInput value={node.stroke} onChange={(v) => set({ stroke: v })} />
          </Row>
          <Row label="Stroke width">
            <RangeInput
              min={0}
              max={32}
              step={1}
              value={node.strokeWidth}
              onChange={(v) => set({ strokeWidth: v })}
            />
          </Row>
        </Section>
      );

    case "star":
      return (
        <Section title="Star">
          <Row label="Fill">
            <ColorInput value={node.fill} onChange={(v) => set({ fill: v })} />
          </Row>
          <Row label="Stroke">
            <ColorInput value={node.stroke} onChange={(v) => set({ stroke: v })} />
          </Row>
          <Row label="Stroke width">
            <RangeInput
              min={0}
              max={32}
              step={1}
              value={node.strokeWidth}
              onChange={(v) => set({ strokeWidth: v })}
            />
          </Row>
          <Row label="Points">
            <RangeInput
              min={3}
              max={12}
              step={1}
              value={node.points}
              onChange={(v) => set({ points: Math.round(v) })}
            />
          </Row>
          <Row label="Inner ratio">
            <RangeInput
              min={0.1}
              max={0.9}
              step={0.01}
              value={node.innerRadiusRatio}
              onChange={(v) => set({ innerRadiusRatio: v })}
            />
          </Row>
        </Section>
      );

    case "line":
      return (
        <Section title="Line">
          <Row label="Color">
            <ColorInput value={node.stroke} onChange={(v) => set({ stroke: v })} />
          </Row>
          <Row label="Width">
            <RangeInput
              min={1}
              max={32}
              step={1}
              value={node.strokeWidth}
              onChange={(v) => set({ strokeWidth: v })}
            />
          </Row>
          <Row label="Arrow">
            <input
              type="checkbox"
              checked={node.arrow}
              onChange={(e) => set({ arrow: e.target.checked })}
            />
          </Row>
        </Section>
      );
  }
}

function onUpload(e: ChangeEvent<HTMLInputElement>, cb: (src: string) => void) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") cb(reader.result);
  };
  reader.readAsDataURL(file);
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
