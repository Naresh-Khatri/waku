"use client";

import {
  Circle,
  Image as ImageIcon,
  Minus,
  Redo2,
  Square,
  Star,
  Triangle,
  Type,
  Undo2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEditor } from "./store";
import type { NodeType } from "./types";

const ITEMS: { type: NodeType; icon: LucideIcon; label: string }[] = [
  { type: "image", icon: ImageIcon, label: "Image" },
  { type: "text", icon: Type, label: "Text" },
  { type: "rectangle", icon: Square, label: "Rectangle" },
  { type: "ellipse", icon: Circle, label: "Ellipse" },
  { type: "triangle", icon: Triangle, label: "Triangle" },
  { type: "star", icon: Star, label: "Star" },
  { type: "line", icon: Minus, label: "Line" },
];

export function InsertBar() {
  const addNode = useEditor((s) => s.addNode);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);

  return (
    <div className="flex items-center gap-1 border-b border-zinc-200 bg-white px-3">
      <div className="flex items-center gap-0.5">
        {ITEMS.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            onClick={() => addNode(type)}
            title={`Add ${label}`}
            className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-zinc-700 hover:bg-zinc-100"
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="mx-2 h-4 w-px bg-zinc-200" />
      <div className="flex items-center gap-0.5">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo"
          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-transparent"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo"
          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-300 disabled:hover:bg-transparent"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
