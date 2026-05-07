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
import { useEditor } from "./store";
import type { EditorNode, Value } from "./types";
import { isParamRef } from "./types";
import { ColorPicker } from "./color-picker";

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
            active={node.italic}
            onClick={() => updateNode(node.id, { italic: !node.italic })}
            label="Italic"
          >
            <Italic className="h-4 w-4" />
          </ToolButton>
          <ColorSwatch
            value={node.color}
            onChange={(v) => updateNode(node.id, { color: v })}
            label="Text color"
          />
        </>
      );
    case "rectangle":
    case "ellipse":
    case "triangle":
    case "star":
      return (
        <>
          <ColorSwatch
            value={node.fill}
            onChange={(v) => updateNode(node.id, { fill: v })}
            label="Fill"
          />
          <ColorSwatch
            value={node.stroke}
            onChange={(v) => updateNode(node.id, { stroke: v })}
            label="Stroke"
          />
        </>
      );
    case "line":
      return (
        <>
          <ColorSwatch
            value={node.stroke}
            onChange={(v) => updateNode(node.id, { stroke: v })}
            label="Color"
          />
          <ToolButton
            active={node.arrow}
            onClick={() => updateNode(node.id, { arrow: !node.arrow })}
            label="Arrow"
          >
            <span className="text-[11px] font-medium">Arrow</span>
          </ToolButton>
        </>
      );
    case "image":
      return (
        <button
          disabled={isParamRef(node.src)}
          onClick={() => {
            const current = isParamRef(node.src) ? "" : node.src;
            const url = window.prompt("Image URL", current);
            if (url) updateNode(node.id, { src: url });
          }}
          className="rounded-md px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
          title={isParamRef(node.src) ? `Bound to {${node.src.$param}}` : "Replace image"}
        >
          {isParamRef(node.src) ? `{${node.src.$param}}` : "Replace"}
        </button>
      );
  }
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
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  active?: boolean;
  danger?: boolean;
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
      className={`flex h-8 min-w-[32px] items-center justify-center rounded-md px-1.5 ${cls}`}
    >
      {children}
    </button>
  );
}

function ColorSwatch({
  value,
  onChange,
  label,
}: {
  value: Value<string>;
  onChange: (v: string) => void;
  label: string;
}) {
  if (isParamRef(value)) {
    return (
      <span
        title={`Bound to {${value.$param}}`}
        className="flex h-7 items-center rounded-md border border-indigo-200 bg-indigo-50 px-2 text-[10px] font-mono text-indigo-700"
      >
        {`{${value.$param}}`}
      </span>
    );
  }
  return <ColorPicker value={value} onChange={onChange} label={label} compact />;
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-zinc-200" />;
}
