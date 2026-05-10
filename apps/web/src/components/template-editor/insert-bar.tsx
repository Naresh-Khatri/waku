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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
          <Tooltip key={type}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addNode(type)}
                className="text-zinc-700"
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add {label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <Separator orientation="vertical" className="mx-2 !h-4" />
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={undo}
              disabled={!canUndo}
              aria-label="Undo"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={redo}
              disabled={!canRedo}
              aria-label="Redo"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
