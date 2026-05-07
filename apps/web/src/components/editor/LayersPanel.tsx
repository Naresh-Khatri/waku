"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Node } from "@waku/ir";

import { useEditorStore } from "./StoreProvider";
import { lastIndex, parentPath, type NodePath } from "./path";

type FlatItem = { path: NodePath; node: Node };

const flatten = (root: Node, path: NodePath = "0", out: FlatItem[] = []): FlatItem[] => {
  if (path !== "0") out.push({ path, node: root });
  if (root.type === "frame" || root.type === "stack") {
    const children = root.children ?? [];
    children.forEach((c, i) => flatten(c, `${path}.children.${i}`, out));
  }
  return out;
};

export function LayersPanel() {
  const ir = useEditorStore((s) => s.ir);
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const moveNode = useEditorStore((s) => s.moveNode);

  const items = flatten(ir);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = String(active.id);
    const to = String(over.id);
    const toParent = parentPath(to);
    if (!toParent) return;
    const toIdx = lastIndex(to);
    moveNode(from, toParent, toIdx);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#1f2937] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af]">
        <span>Layers</span>
        <span className="text-[#6b7280]">{items.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-[11px] text-[#6b7280]">
            No layers yet. Use the insert bar to add one.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={items.map((it) => it.path)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((it) => (
                <LayerItem
                  key={it.path}
                  id={it.path}
                  node={it.node}
                  selected={selection.includes(it.path)}
                  onSelect={(additive) => select(it.path, additive)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function LayerItem({
  id,
  node,
  selected,
  onSelect,
}: {
  id: NodePath;
  node: Node;
  selected: boolean;
  onSelect: (additive: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e.shiftKey);
      }}
      className={[
        "group flex items-center gap-1.5 px-2 py-[6px] text-xs cursor-pointer select-none",
        selected
          ? "bg-[#7c5cff22] text-white"
          : "text-[#d1d5db] hover:bg-[#111827]",
      ].join(" ")}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="flex h-4 w-3 cursor-grab items-center justify-center text-[10px] text-[#4b5563] hover:text-[#9ca3af] active:cursor-grabbing"
        aria-label="drag handle"
      >
        ⋮⋮
      </button>
      <NodeIcon type={node.type} />
      <span className="truncate font-mono text-[11px]">{labelFor(node)}</span>
    </div>
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
