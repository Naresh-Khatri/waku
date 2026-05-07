"use client";

import { Link2, Link2Off } from "lucide-react";
import type { BindTarget } from "./bind-param-modal";
import { useEditorConfig } from "./editor-config";
import { useEditor } from "./store";
import type { ParamKind, Value } from "./types";
import { isParamRef } from "./types";

export function BindButton({
  target,
  field,
  paramKind,
  value,
  fallback,
}: {
  target: BindTarget;
  field: string;
  paramKind: ParamKind;
  value: Value<string>;
  fallback: string;
}) {
  const { enableParams, openBindModal } = useEditorConfig();
  const unbind = useEditor((s) => s.unbind);
  if (!enableParams || !openBindModal) return null;

  const bound = isParamRef(value);
  if (bound) {
    return (
      <button
        onClick={() => {
          const id = target.kind === "node" ? target.id : "artboard";
          unbind(id, field, fallback);
        }}
        title={`Unbind from {${value.$param}}`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-indigo-600 hover:bg-indigo-50"
      >
        <Link2Off className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <button
      onClick={() =>
        openBindModal({
          target,
          field,
          paramKind,
          currentValue: typeof value === "string" ? value : "",
        })
      }
      title="Bind to a param"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
    >
      <Link2 className="h-3.5 w-3.5" />
    </button>
  );
}
