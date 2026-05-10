"use client";

import {
  ArrowUp,
  ArrowDown,
  Bold,
  Copy,
  Italic,
  Lock,
  LockOpen,
  Trash2,
} from "lucide-react";
import type { CSSProperties } from "react";
import { Bindable } from "./bind-button";
import { PaintInput } from "./paint-picker";
import { useEditor } from "./store";
import type { EditorNode, Paint, ParamKind } from "./types";
import { isFlatPaint, isParamRef } from "./types";

export function FloatingToolbar({
  node,
  left,
  top,
}: {
  node: EditorNode;
  left: number;
  top: number;
}) {
  const style: CSSProperties = {
    position: "absolute",
    left,
    top: top - 12,
    transform: "translate(-50%, -100%)",
    pointerEvents: "auto",
    zIndex: 20,
  };

  return (
    <div
      style={style}
      onPointerDown={(e) => e.stopPropagation()}
      className="flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white px-1 py-1 shadow-lg"
    >
      <TypeSpecificControls node={node} />
      <Divider />
      <CommonControls node={node} />
    </div>
  );
}

function TypeSpecificControls({ node }: { node: EditorNode }) {
  const updateNode = useEditor((s) => s.updateNode);
  switch (node.type) {
    case "text":
      return (
        <>
          <ToolButton
            active={node.fontWeight >= 700}
            onClick={() =>
              updateNode(node.id, { fontWeight: node.fontWeight >= 700 ? 400 : 700 })
            }
            label="Bold"
          >
            <Bold className="h-4 w-4" />
          </ToolButton>
          <ToolButton
            active={!isParamRef(node.italic) && node.italic}
            disabled={isParamRef(node.italic)}
            onClick={() =>
              !isParamRef(node.italic) &&
              updateNode(node.id, { italic: !node.italic })
            }
            label={
              isParamRef(node.italic)
                ? `Bound to {${node.italic.$param}}`
                : "Italic"
            }
          >
            <Italic className="h-4 w-4" />
          </ToolButton>
          <BindablePaint
            nodeId={node.id}
            field="color"
            value={node.color}
            onChange={(v) => updateNode(node.id, { color: v })}
            label="Text color"
            fallback={{ kind: "flat", color: "#111111" }}
          />
        </>
      );
    case "rectangle":
    case "ellipse":
    case "triangle":
    case "star": {
      const fillFallback =
        node.type === "rectangle"
          ? "#6366f1"
          : node.type === "ellipse"
            ? "#ec4899"
            : node.type === "triangle"
              ? "#10b981"
              : "#f59e0b";
      return (
        <>
          <BindablePaint
            nodeId={node.id}
            field="fill"
            value={node.fill}
            onChange={(v) => updateNode(node.id, { fill: v })}
            label="Fill"
            fallback={{ kind: "flat", color: fillFallback }}
          />
          <BindablePaint
            nodeId={node.id}
            field="stroke"
            value={node.stroke}
            onChange={(v) => updateNode(node.id, { stroke: v })}
            label="Stroke"
            fallback={{ kind: "flat", color: "#000000" }}
          />
        </>
      );
    }
    case "line":
      return (
        <>
          <BindablePaint
            nodeId={node.id}
            field="stroke"
            value={node.stroke}
            onChange={(v) => updateNode(node.id, { stroke: v })}
            label="Color"
            fallback={{ kind: "flat", color: "#111111" }}
          />
          <ToolButton
            active={!isParamRef(node.arrow) && node.arrow}
            disabled={isParamRef(node.arrow)}
            onClick={() =>
              !isParamRef(node.arrow) &&
              updateNode(node.id, { arrow: !node.arrow })
            }
            label={
              isParamRef(node.arrow)
                ? `Bound to {${node.arrow.$param}}`
                : "Arrow"
            }
          >
            <span className="text-[11px] font-medium">Arrow</span>
          </ToolButton>
        </>
      );
    case "image":
      return (
        <Bindable
          target={{ kind: "node", id: node.id }}
          field="src"
          paramKind="url"
          value={node.src}
          fallback=""
        >
          <button
            onClick={() => {
              const current = isParamRef(node.src) ? "" : node.src;
              const url = window.prompt("Image URL", current);
              if (url) updateNode(node.id, { src: url });
            }}
            className="rounded-md px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
            title="Replace image"
          >
            Replace
          </button>
        </Bindable>
      );
  }
}

function BindablePaint({
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

function CommonControls({ node }: { node: EditorNode }) {
  const updateNode = useEditor((s) => s.updateNode);
  const removeNode = useEditor((s) => s.removeNode);
  const duplicate = useEditor((s) => s.duplicate);
  const raise = useEditor((s) => s.raise);
  const lower = useEditor((s) => s.lower);
  return (
    <>
      <ToolButton onClick={() => raise(node.id)} label="Bring forward">
        <ArrowUp className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => lower(node.id)} label="Send backward">
        <ArrowDown className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => duplicate(node.id)} label="Duplicate">
        <Copy className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => updateNode(node.id, { locked: !node.locked })}
        label={node.locked ? "Unlock" : "Lock"}
      >
        {node.locked ? (
          <Lock className="h-4 w-4" />
        ) : (
          <LockOpen className="h-4 w-4" />
        )}
      </ToolButton>
      <ToolButton onClick={() => removeNode(node.id)} label="Delete" danger>
        <Trash2 className="h-4 w-4" />
      </ToolButton>
    </>
  );
}

function ToolButton({
  children,
  onClick,
  label,
  active,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  const cls = active
    ? "bg-indigo-50 text-indigo-700"
    : danger
      ? "text-zinc-600 hover:bg-rose-50 hover:text-rose-600"
      : "text-zinc-700 hover:bg-zinc-100";
  return (
    <button
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 min-w-[32px] items-center justify-center rounded-md px-1.5 ${cls} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-zinc-200" />;
}
