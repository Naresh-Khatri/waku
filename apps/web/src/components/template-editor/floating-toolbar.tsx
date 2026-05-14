"use client";

import {
  ArrowDown,
  ArrowUp,
  Copy,
  Lock,
  LockOpen,
  Trash2,
  Variable,
} from "lucide-react";
import type { CSSProperties } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useEditorConfig } from "./editor-config";
import { NodeVariablesPopover } from "./node-variables-popover";
import { useEditor } from "./store";
import type { EditorNode } from "./types";

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

  const { enableParams } = useEditorConfig();
  const updateNode = useEditor((s) => s.updateNode);
  const removeNode = useEditor((s) => s.removeNode);
  const duplicate = useEditor((s) => s.duplicate);
  const raise = useEditor((s) => s.raise);
  const lower = useEditor((s) => s.lower);

  return (
    <div
      style={style}
      onPointerDown={(e) => e.stopPropagation()}
      className="flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white px-1 py-1 shadow-lg"
    >
      <ToolButton onClick={() => raise(node.id)} label="Bring forward">
        <ArrowUp className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => lower(node.id)} label="Send backward">
        <ArrowDown className="h-4 w-4" />
      </ToolButton>
      <Separator orientation="vertical" className="mx-0.5 !h-5" />
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
      {enableParams ? (
        <>
          <Separator orientation="vertical" className="mx-0.5 !h-5" />
          <NodeVariablesPopover
            node={node}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Variables"
                className="min-w-8"
              >
                <Variable className="h-4 w-4" />
              </Button>
            }
          />
        </>
      ) : null}
      <Separator orientation="vertical" className="mx-0.5 !h-5" />
      <ToolButton onClick={() => removeNode(node.id)} label="Delete" danger>
        <Trash2 className="h-4 w-4" />
      </ToolButton>
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  label,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClick}
          aria-label={label}
          className={cn(
            "min-w-8",
            danger &&
              "text-zinc-600 hover:bg-rose-50 hover:text-rose-600",
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
