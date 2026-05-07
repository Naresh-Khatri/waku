"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import type {
  Fill,
  FrameNode,
  GradientNode,
  ImageNode,
  Inset,
  ParamRef,
  ShapeNode,
  StackNode,
  TextNode,
} from "@waku/ir";
import { isParamRef } from "@waku/ir";
import { ChevronDown, ChevronRight, Link as LinkIcon, X } from "lucide-react";

import { useEditorStore } from "./StoreProvider";
import { getNodeAt, type NodePath } from "./path";

export type FieldKind = "string" | "number" | "boolean" | "enum" | "url" | "color";

export type OpenBindModal = (params: {
  path: NodePath;
  field: string;
  kind: FieldKind;
  currentValue: unknown;
}) => void;

const inputBase: CSSProperties = {
  width: "100%",
  background: "#0b0f1a",
  color: "#e5e7eb",
  border: "1px solid #1f2937",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 12,
  fontFamily: "inherit",
};

export function Inspector({
  onOpenBindModal,
}: {
  onOpenBindModal: OpenBindModal;
}) {
  const ir = useEditorStore((s) => s.ir);
  const selection = useEditorStore((s) => s.selection);
  const setProp = useEditorStore((s) => s.setProp);
  const deleteNode = useEditorStore((s) => s.deleteNode);
  const unbind = useEditorStore((s) => s.unbind);

  if (selection.length !== 1) {
    return (
      <Shell>
        <Empty>
          {selection.length === 0
            ? "Nothing selected"
            : `${selection.length} nodes — pick one`}
        </Empty>
      </Shell>
    );
  }

  const path = selection[0]!;
  const node = getNodeAt(ir, path);
  if (!node) {
    return (
      <Shell>
        <Empty>Node not found</Empty>
      </Shell>
    );
  }

  const set = (key: string, value: unknown) => setProp(path, key, value);

  const renderBindable = (
    field: string,
    kind: FieldKind,
    currentValue: unknown,
    inputRender: () => ReactNode,
  ) => {
    const bound = isParamRef(currentValue);
    return (
      <Row>
        <Label>{field}</Label>
        <div style={{ display: "flex", gap: 4, alignItems: "center", flex: 1 }}>
          {bound ? (
            <ParamChip
              paramRef={currentValue as ParamRef}
              onUnbind={() =>
                unbind(path, field, (currentValue as ParamRef).default ?? "")
              }
            />
          ) : (
            <div style={{ flex: 1 }}>{inputRender()}</div>
          )}
          <BindButton
            onClick={() =>
              onOpenBindModal({ path, field, kind, currentValue })
            }
            bound={bound}
          />
        </div>
      </Row>
    );
  };

  return (
    <Shell>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          borderBottom: "1px solid #1f2937",
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: "#9ca3af" }}>
          {node.type}
        </div>
        <button
          onClick={() => deleteNode(path)}
          disabled={path === "0"}
          style={{
            fontSize: 11,
            color: "#ef4444",
            background: "transparent",
            border: "1px solid #1f2937",
            borderRadius: 6,
            padding: "4px 8px",
            cursor: path === "0" ? "not-allowed" : "pointer",
            opacity: path === "0" ? 0.4 : 1,
          }}
        >
          delete
        </button>
      </header>

      <div style={{ overflowY: "auto", flex: 1 }}>
        {node.type === "frame" && <FrameSection node={node} set={set} />}
        {node.type === "stack" && <StackSection node={node} set={set} />}
        {node.type === "text" && (
          <TextSection node={node} set={set} renderBindable={renderBindable} />
        )}
        {node.type === "image" && (
          <ImageSection node={node} set={set} renderBindable={renderBindable} />
        )}
        {node.type === "shape" && <ShapeSection node={node} set={set} />}
        {node.type === "gradient" && <GradientSection node={node} set={set} />}
      </div>
    </Shell>
  );
}

type Set = (key: string, value: unknown) => void;

function Shell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: 16,
        fontSize: 12,
        color: "#6b7280",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section style={{ borderBottom: "1px solid #1f2937" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          background: "transparent",
          color: "#9ca3af",
          border: "none",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          cursor: "pointer",
        }}
      >
        <span>{title}</span>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && (
        <div style={{ padding: "0 12px 10px", display: "grid", gap: 8 }}>
          {children}
        </div>
      )}
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "70px 1fr",
        alignItems: "center",
        gap: 8,
      }}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        color: "#9ca3af",
      }}
    >
      {children}
    </div>
  );
}

function NumberField({
  value,
  onChange,
  step,
  min,
  max,
}: {
  value: number | undefined;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      value={value ?? ""}
      step={step ?? 1}
      min={min}
      max={max}
      onChange={(e) => {
        const n = e.target.valueAsNumber;
        if (Number.isFinite(n)) onChange(n);
      }}
      style={inputBase}
    />
  );
}

function TextField({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={inputBase}
    />
  );
}

function ColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input
        type="color"
        value={value.startsWith("#") ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 28,
          height: 28,
          padding: 0,
          background: "transparent",
          border: "1px solid #1f2937",
          borderRadius: 6,
        }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputBase, flex: 1 }}
      />
    </div>
  );
}

function SelectField<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      style={inputBase}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function BindButton({
  onClick,
  bound,
}: {
  onClick: () => void;
  bound: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={bound ? "edit binding" : "bind to param"}
      style={{
        flex: "0 0 auto",
        width: 24,
        height: 24,
        background: bound ? "#7c5cff22" : "transparent",
        color: bound ? "#7c5cff" : "#6b7280",
        border: `1px solid ${bound ? "#7c5cff66" : "#1f2937"}`,
        borderRadius: 6,
        cursor: "pointer",
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <LinkIcon size={12} />
    </button>
  );
}

function ParamChip({
  paramRef,
  onUnbind,
}: {
  paramRef: ParamRef;
  onUnbind: () => void;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#7c5cff22",
        color: "#c4b5fd",
        border: "1px solid #7c5cff66",
        borderRadius: 6,
        padding: "4px 8px",
        fontSize: 12,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <LinkIcon size={11} />
        {paramRef.$param}
      </span>
      <button
        onClick={onUnbind}
        title="unbind"
        style={{
          background: "transparent",
          color: "#c4b5fd",
          border: "none",
          cursor: "pointer",
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ---------------- sections ----------------

function FrameSection({ node, set }: { node: FrameNode; set: Set }) {
  return (
    <>
      <Section title="Layout">
        <Row>
          <Label>w</Label>
          <NumberField value={node.w} onChange={(n) => set("w", n)} />
        </Row>
        <Row>
          <Label>h</Label>
          <NumberField value={node.h} onChange={(n) => set("h", n)} />
        </Row>
      </Section>
      <Section title="Fill">
        <FillRow fill={node.bg} onChange={(f) => set("bg", f)} />
      </Section>
    </>
  );
}

function StackSection({ node, set }: { node: StackNode; set: Set }) {
  return (
    <>
      <Section title="Layout">
        <Row>
          <Label>dir</Label>
          <SelectField
            value={node.dir}
            options={["row", "col"] as const}
            onChange={(v) => set("dir", v)}
          />
        </Row>
        <Row>
          <Label>gap</Label>
          <NumberField value={node.gap} onChange={(n) => set("gap", n)} />
        </Row>
        <Row>
          <Label>align</Label>
          <SelectField
            value={node.align ?? "start"}
            options={["start", "center", "end", "stretch"] as const}
            onChange={(v) => set("align", v)}
          />
        </Row>
        <Row>
          <Label>justify</Label>
          <SelectField
            value={node.justify ?? "start"}
            options={
              ["start", "center", "end", "between", "around", "evenly"] as const
            }
            onChange={(v) => set("justify", v)}
          />
        </Row>
        <InsetRow value={node.pad} onChange={(v) => set("pad", v)} />
        <Row>
          <Label>w</Label>
          <NumberField
            value={typeof node.w === "number" ? node.w : undefined}
            onChange={(n) => set("w", n)}
          />
        </Row>
        <Row>
          <Label>h</Label>
          <NumberField
            value={typeof node.h === "number" ? node.h : undefined}
            onChange={(n) => set("h", n)}
          />
        </Row>
      </Section>
      <Section title="Fill">
        <FillRow fill={node.bg} onChange={(f) => set("bg", f)} />
        <Row>
          <Label>radius</Label>
          <NumberField value={node.radius} onChange={(n) => set("radius", n)} />
        </Row>
      </Section>
    </>
  );
}

function TextSection({
  node,
  set,
  renderBindable,
}: {
  node: TextNode;
  set: Set;
  renderBindable: (
    field: string,
    kind: FieldKind,
    currentValue: unknown,
    inputRender: () => ReactNode,
  ) => ReactNode;
}) {
  return (
    <>
      <Section title="Content">
        {renderBindable("value", "string", node.value, () => (
          <TextField
            value={typeof node.value === "string" ? node.value : ""}
            onChange={(v) => set("value", v)}
          />
        ))}
      </Section>
      <Section title="Typography">
        <Row>
          <Label>family</Label>
          <TextField
            value={node.font.family}
            onChange={(v) => set("font", { ...node.font, family: v })}
          />
        </Row>
        <Row>
          <Label>size</Label>
          <NumberField value={node.size} onChange={(n) => set("size", n)} />
        </Row>
        <Row>
          <Label>weight</Label>
          <NumberField
            value={node.weight ?? node.font.weight ?? 400}
            min={100}
            max={900}
            step={100}
            onChange={(n) => set("weight", n)}
          />
        </Row>
        {renderBindable("color", "color", node.color, () => (
          <ColorField
            value={typeof node.color === "string" ? node.color : "#000000"}
            onChange={(v) => set("color", v)}
          />
        ))}
        <Row>
          <Label>align</Label>
          <SelectField
            value={node.align ?? "left"}
            options={["left", "center", "right"] as const}
            onChange={(v) => set("align", v)}
          />
        </Row>
        <Row>
          <Label>line-h</Label>
          <NumberField
            value={node.lineHeight}
            step={0.1}
            onChange={(n) => set("lineHeight", n)}
          />
        </Row>
        <Row>
          <Label>tracking</Label>
          <NumberField
            value={node.tracking}
            step={0.5}
            onChange={(n) => set("tracking", n)}
          />
        </Row>
        <Row>
          <Label>maxLines</Label>
          <NumberField
            value={node.maxLines}
            onChange={(n) => set("maxLines", n)}
          />
        </Row>
      </Section>
    </>
  );
}

function ImageSection({
  node,
  set,
  renderBindable,
}: {
  node: ImageNode;
  set: Set;
  renderBindable: (
    field: string,
    kind: FieldKind,
    currentValue: unknown,
    inputRender: () => ReactNode,
  ) => ReactNode;
}) {
  return (
    <Section title="Image">
      {renderBindable("src", "url", node.src, () => (
        <TextField
          value={typeof node.src === "string" ? node.src : ""}
          onChange={(v) => set("src", v)}
        />
      ))}
      <Row>
        <Label>fit</Label>
        <SelectField
          value={node.fit}
          options={["cover", "contain"] as const}
          onChange={(v) => set("fit", v)}
        />
      </Row>
      <Row>
        <Label>w</Label>
        <NumberField value={node.w} onChange={(n) => set("w", n)} />
      </Row>
      <Row>
        <Label>h</Label>
        <NumberField value={node.h} onChange={(n) => set("h", n)} />
      </Row>
      <Row>
        <Label>radius</Label>
        <NumberField value={node.radius} onChange={(n) => set("radius", n)} />
      </Row>
    </Section>
  );
}

function ShapeSection({ node, set }: { node: ShapeNode; set: Set }) {
  return (
    <>
      <Section title="Shape">
        <Row>
          <Label>kind</Label>
          <SelectField
            value={node.kind}
            options={["rect", "circle"] as const}
            onChange={(v) => set("kind", v)}
          />
        </Row>
        <Row>
          <Label>w</Label>
          <NumberField value={node.w} onChange={(n) => set("w", n)} />
        </Row>
        <Row>
          <Label>h</Label>
          <NumberField value={node.h} onChange={(n) => set("h", n)} />
        </Row>
        <Row>
          <Label>radius</Label>
          <NumberField value={node.radius} onChange={(n) => set("radius", n)} />
        </Row>
      </Section>
      <Section title="Fill">
        <FillRow fill={node.fill} onChange={(f) => set("fill", f)} />
      </Section>
    </>
  );
}

function GradientSection({ node, set }: { node: GradientNode; set: Set }) {
  const setStop = (i: number, patch: Partial<{ color: string; offset: number }>) => {
    const stops = node.gradient.stops.map((s, idx) =>
      idx === i ? { ...s, ...patch } : s,
    );
    set("gradient", { ...node.gradient, stops });
  };
  return (
    <>
      <Section title="Layout">
        <Row>
          <Label>w</Label>
          <NumberField value={node.w} onChange={(n) => set("w", n)} />
        </Row>
        <Row>
          <Label>h</Label>
          <NumberField value={node.h} onChange={(n) => set("h", n)} />
        </Row>
        <Row>
          <Label>radius</Label>
          <NumberField value={node.radius} onChange={(n) => set("radius", n)} />
        </Row>
      </Section>
      <Section title="Gradient">
        <Row>
          <Label>type</Label>
          <SelectField
            value={node.gradient.type}
            options={["linear", "radial"] as const}
            onChange={(v) => set("gradient", { ...node.gradient, type: v })}
          />
        </Row>
        {node.gradient.type === "linear" && (
          <Row>
            <Label>angle</Label>
            <NumberField
              value={node.gradient.angle}
              onChange={(n) => set("gradient", { ...node.gradient, angle: n })}
            />
          </Row>
        )}
        {node.gradient.stops.map((s, i) => (
          <Row key={i}>
            <Label>stop {i}</Label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="color"
                value={s.color.startsWith("#") ? s.color : "#000000"}
                onChange={(e) => setStop(i, { color: e.target.value })}
                style={{
                  width: 28,
                  height: 28,
                  padding: 0,
                  background: "transparent",
                  border: "1px solid #1f2937",
                  borderRadius: 6,
                }}
              />
              <input
                type="number"
                value={s.offset}
                step={0.05}
                min={0}
                max={1}
                onChange={(e) => setStop(i, { offset: e.target.valueAsNumber })}
                style={{ ...inputBase, flex: 1 }}
              />
            </div>
          </Row>
        ))}
      </Section>
    </>
  );
}

function FillRow({
  fill,
  onChange,
}: {
  fill: Fill | undefined;
  onChange: (f: Fill) => void;
}) {
  const isString = typeof fill === "string";
  return (
    <Row>
      <Label>color</Label>
      <ColorField
        value={isString ? (fill as string) : ""}
        onChange={(v) => onChange(v)}
      />
    </Row>
  );
}

function InsetRow({
  value,
  onChange,
}: {
  value: Inset | undefined;
  onChange: (v: Inset) => void;
}) {
  const obj =
    typeof value === "number"
      ? { t: value, r: value, b: value, l: value }
      : value ?? {};
  const set = (side: "t" | "r" | "b" | "l", n: number) =>
    onChange({ ...obj, [side]: n });
  return (
    <Row>
      <Label>pad</Label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {(["t", "r", "b", "l"] as const).map((side) => (
          <input
            key={side}
            type="number"
            placeholder={side}
            value={obj[side] ?? ""}
            onChange={(e) => {
              const n = e.target.valueAsNumber;
              if (Number.isFinite(n)) set(side, n);
            }}
            style={inputBase}
          />
        ))}
      </div>
    </Row>
  );
}
