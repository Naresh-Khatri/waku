"use client";

import { Variable } from "lucide-react";
import type { ReactNode } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

import { Bindable } from "./bind-button";
import { type BindingField, NODE_BINDINGS, fallbackForKind } from "./node-bindings";
import type { EditorNode, Paint, Value } from "./types";

interface NodeVariablesPopoverProps {
  node: EditorNode;
  trigger: ReactNode;
}

export function NodeVariablesPopover({
  node,
  trigger,
}: NodeVariablesPopoverProps) {
  const fields = NODE_BINDINGS[node.type] ?? [];

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={8}
        className="w-[280px] p-0"
        onPointerDown={(e) => e.stopPropagation()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
          <span className="text-[11px] font-semibold text-zinc-700">
            Bindings
          </span>
          <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-zinc-500">
            {node.type}
          </span>
        </div>
        <ScrollArea className="max-h-[320px]">
          <ul className="flex flex-col py-1">
            {fields.map((f) => (
              <FieldRow key={f.field} node={node} field={f} />
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function FieldRow({ node, field }: { node: EditorNode; field: BindingField }) {
  const raw = (node as unknown as Record<string, unknown>)[field.field];
  const value = (field.paint ? (raw as Paint) : (raw as Value<unknown>)) ?? null;
  const fallback = fallbackForKind(field.kind, field.paint);

  return (
    <li className="flex items-center gap-2 px-2 py-1 hover:bg-zinc-50">
      <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-700">
        {field.label}
      </span>
      <div className="flex shrink-0 items-center">
        {field.paint ? (
          <Bindable
            paint
            target={{ kind: "node", id: node.id }}
            field={field.field}
            paramKind={field.kind}
            value={value as Paint}
            fallback={fallback as Paint}
          >
            <span className="text-[10px] text-zinc-300">—</span>
          </Bindable>
        ) : (
          <Bindable
            target={{ kind: "node", id: node.id }}
            field={field.field}
            paramKind={field.kind}
            value={value as Value<unknown>}
            fallback={fallback}
          >
            <span className="text-[10px] text-zinc-300">—</span>
          </Bindable>
        )}
      </div>
    </li>
  );
}

export { Variable as NodeVariablesIcon };
