"use client";

import { useState, type DragEvent } from "react";
import type { Node } from "@waku/ir";

import { useEditorStore } from "./StoreProvider";
import { getNodeAt, parentPath, type NodePath } from "./path";

type DropPosition = "before" | "after" | "inside";

type Hover = { path: NodePath; position: DropPosition } | null;

export function LayersPanel() {
  const ir = useEditorStore((s) => s.ir);
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const moveNode = useEditorStore((s) => s.moveNode);

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<NodePath | null>(null);
  const [hover, setHover] = useState<Hover>(null);

  const toggle = (path: NodePath) =>
    setCollapsed((m) => ({ ...m, [path]: !m[path] }));

  const isAncestorOf = (anc: NodePath, p: NodePath) =>
    p === anc || p.startsWith(`${anc}.`);

  const onDrop = (target: NodePath, position: DropPosition) => {
    if (!drag) return;
    if (isAncestorOf(drag, target)) return;
    const targetNode = getNodeAt(ir, target);
    if (!targetNode) return;

    if (position === "inside") {
      if (targetNode.type !== "frame" && targetNode.type !== "stack") return;
      const idx = (targetNode.children ?? []).length;
      moveNode(drag, target, idx);
      return;
    }

    const parent = parentPath(target);
    if (!parent) return;
    const segs = target.split(".");
    const idx = Number(segs[segs.length - 1]);
    moveNode(drag, parent, position === "before" ? idx : idx + 1);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#1f2937] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">
        Layers
      </div>
      <div
        className="flex-1 overflow-y-auto py-1"
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setHover(null);
        }}
      >
        <LayerRow
          ir={ir}
          path="0"
          depth={0}
          selection={selection}
          collapsed={collapsed}
          onToggle={toggle}
          onSelect={select}
          drag={drag}
          hover={hover}
          onDragStart={setDrag}
          onDragEnd={() => {
            setDrag(null);
            setHover(null);
          }}
          onHover={setHover}
          onDrop={onDrop}
          isAncestorOf={isAncestorOf}
        />
      </div>
    </div>
  );
}

type RowProps = {
  ir: Node;
  path: NodePath;
  depth: number;
  selection: NodePath[];
  collapsed: Record<string, boolean>;
  onToggle: (p: NodePath) => void;
  onSelect: (p: NodePath, additive?: boolean) => void;
  drag: NodePath | null;
  hover: Hover;
  onDragStart: (p: NodePath) => void;
  onDragEnd: () => void;
  onHover: (h: Hover) => void;
  onDrop: (target: NodePath, position: DropPosition) => void;
  isAncestorOf: (anc: NodePath, p: NodePath) => boolean;
};

function LayerRow(props: RowProps) {
  const {
    ir,
    path,
    depth,
    selection,
    collapsed,
    onToggle,
    onSelect,
    drag,
    hover,
    onDragStart,
    onDragEnd,
    onHover,
    onDrop,
    isAncestorOf,
  } = props;

  const node = getNodeAt(ir, path);
  if (!node) return null;

  const isSelected = selection.includes(path);
  const isOpen = !collapsed[path];
  const hasChildren =
    (node.type === "frame" || node.type === "stack") &&
    (node.children?.length ?? 0) > 0;
  const canHaveChildren = node.type === "frame" || node.type === "stack";
  const isRoot = path === "0";
  const draggable = !isRoot;
  const isDraggedOverInvalid = drag !== null && isAncestorOf(drag, path);

  const showHover = hover?.path === path && !isDraggedOverInvalid;

  const onRowDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!drag) return;
    if (isAncestorOf(drag, path)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const rect = e.currentTarget.getBoundingClientRect();
    const offset = e.clientY - rect.top;
    const h = rect.height;

    let position: DropPosition;
    if (canHaveChildren && !isRoot) {
      // top 25% = before, bottom 25% = after, middle 50% = inside
      if (offset < h * 0.25) position = "before";
      else if (offset > h * 0.75) position = "after";
      else position = "inside";
    } else if (isRoot) {
      position = "inside";
    } else {
      position = offset < h / 2 ? "before" : "after";
    }
    onHover({ path, position });
  };

  const onRowDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hover) return;
    onDrop(hover.path, hover.position);
    onDragEnd();
  };

  return (
    <>
      <div
        draggable={draggable}
        onDragStart={(e) => {
          if (!draggable) return;
          e.stopPropagation();
          e.dataTransfer.effectAllowed = "move";
          onDragStart(path);
        }}
        onDragEnd={onDragEnd}
        onDragOver={onRowDragOver}
        onDrop={onRowDrop}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(path, e.shiftKey);
        }}
        className={[
          "group relative flex items-center gap-1.5 px-2 py-[5px] text-xs cursor-pointer select-none",
          isSelected
            ? "bg-[#7c5cff22] text-white"
            : "text-[#d1d5db] hover:bg-[#111827]",
          drag === path ? "opacity-40" : "",
        ].join(" ")}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        {showHover && hover.position === "before" && (
          <div className="pointer-events-none absolute inset-x-1 top-0 h-[2px] bg-[#7c5cff]" />
        )}
        {showHover && hover.position === "after" && (
          <div className="pointer-events-none absolute inset-x-1 bottom-0 h-[2px] bg-[#7c5cff]" />
        )}
        {showHover && hover.position === "inside" && (
          <div className="pointer-events-none absolute inset-0 rounded-sm border border-[#7c5cff] bg-[#7c5cff14]" />
        )}

        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(path);
            }}
            className="flex h-3 w-3 items-center justify-center text-[9px] text-[#6b7280] hover:text-[#e5e7eb]"
          >
            {isOpen ? "▾" : "▸"}
          </button>
        ) : (
          <span className="inline-block w-3" />
        )}
        <NodeIcon type={node.type} />
        <span className="truncate font-mono text-[11px]">{labelFor(node)}</span>
      </div>

      {hasChildren && isOpen && (
        <>
          {(node.children ?? []).map((_child, i) => (
            <LayerRow
              key={`${path}.children.${i}`}
              {...props}
              path={`${path}.children.${i}`}
              depth={depth + 1}
            />
          ))}
        </>
      )}
    </>
  );
}

function NodeIcon({ type }: { type: Node["type"] }) {
  const map: Record<Node["type"], string> = {
    frame: "▣",
    stack: "⊟",
    text: "T",
    image: "🖼",
    shape: "●",
    gradient: "▧",
  };
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center text-[10px] text-[#9ca3af]">
      {map[type]}
    </span>
  );
}

function labelFor(node: Node): string {
  if (node.type === "text") {
    const v = typeof node.value === "string" ? node.value : "(bound)";
    return `text: ${v.slice(0, 28)}`;
  }
  if (node.type === "image") return "image";
  if (node.type === "shape") return `${node.kind}`;
  if (node.type === "gradient") return "gradient";
  if (node.type === "stack") return `stack ${node.dir}`;
  if (node.type === "frame") return `frame ${node.w}×${node.h}`;
  return "node";
}
