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
import { ScrollArea } from "@/components/ui/scroll-area";
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

export function LayersPanel() {
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

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-md">
      <div className="flex h-9 items-center justify-between border-b border-zinc-200 px-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Layers
        </span>
        <span className="text-[10px] text-zinc-400">{nodes.length}</span>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-1">
          {nodes.length === 0 ? (
            <div className="px-3 py-6 text-xs text-zinc-400">
              Add a layer from the top bar.
            </div>
          ) : (
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
          )}
        </div>
      </ScrollArea>
    </aside>
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
