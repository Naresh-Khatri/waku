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
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Circle,
  Eye,
  EyeOff,
  GripVertical,
  Heart,
  Image as ImageIcon,
  Lock,
  LockOpen,
  Minus,
  Square,
  Star,
  Triangle,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEditor } from "./store";
import type { EditorNode, NodeType } from "./types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ICON: Record<NodeType, LucideIcon> = {
  image: ImageIcon,
  text: Type,
  rectangle: Square,
  ellipse: Circle,
  triangle: Triangle,
  star: Star,
  line: Minus,
  path: Heart,
};

export function LayersList() {
  const nodes = useEditor((s) => s.nodes);
  const selectedId = useEditor((s) => s.selectedId);
  const select = useEditor((s) => s.select);
  const updateNode = useEditor((s) => s.updateNode);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const ordered = [...nodes].reverse();
  const ids = ordered.map((n) => n.id);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(active.id as string);
    const to = ids.indexOf(over.id as string);
    if (from === -1 || to === -1) return;
    const reordered = arrayMove(ordered, from, to);
    useEditor.setState({ nodes: [...reordered].reverse() });
  };

  if (nodes.length === 0) {
    return (
      <div className="px-3 py-6 text-xs text-zinc-400">
        Add a layer from the Elements panel.
      </div>
    );
  }

  return (
    <div className="p-1">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="space-y-0.5">
            {ordered.map((node) => (
              <LayerRow
                key={node.id}
                node={node}
                selected={node.id === selectedId}
                onSelect={() => select(node.id)}
                onToggleVisible={() =>
                  updateNode(node.id, { visible: !node.visible })
                }
                onToggleLocked={() =>
                  updateNode(node.id, { locked: !node.locked })
                }
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function LayerRow({
  node,
  selected,
  onSelect,
  onToggleVisible,
  onToggleLocked,
}: {
  node: EditorNode;
  selected: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onToggleLocked: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });
  const Icon = ICON[node.type];
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-md px-1.5 text-xs",
        selected
          ? "bg-indigo-50 text-indigo-900"
          : "text-zinc-700 hover:bg-zinc-50",
      )}
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="flex h-6 w-4 cursor-grab items-center justify-center text-zinc-300 hover:text-zinc-500"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
      <span className="flex-1 truncate">{node.name}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={(e) => {
          e.stopPropagation();
          onToggleLocked();
        }}
        className="text-zinc-400 hover:text-zinc-700"
        aria-label={node.locked ? "Unlock layer" : "Lock layer"}
      >
        {node.locked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisible();
        }}
        className="text-zinc-400 hover:text-zinc-700"
        aria-label={node.visible ? "Hide layer" : "Show layer"}
      >
        {node.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      </Button>
    </li>
  );
}
