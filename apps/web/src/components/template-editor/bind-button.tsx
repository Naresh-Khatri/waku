"use client";

import { Link2, Link2Off } from "lucide-react";
import type { BindTarget } from "./bind-param-modal";
import { useEditorConfig } from "./editor-config";
import { useEditor } from "./store";
import type { Paint, ParamKind, Value } from "./types";
import { isFlatPaint, isParamRef } from "./types";

type CommonProps = {
  target: BindTarget;
  field: string;
  paramKind: ParamKind;
};

type ValueProps = CommonProps & {
  paint?: false;
  value: Value<string>;
  fallback: Value<string>;
};

type PaintProps = CommonProps & {
  paint: true;
  value: Paint;
  fallback: Paint;
};

export function BindButton(props: ValueProps | PaintProps) {
  const { target, field, paramKind } = props;
  const { enableParams, openBindModal } = useEditorConfig();
  const unbind = useEditor((s) => s.unbind);
  if (!enableParams || !openBindModal) return null;

  // Inner value (a Value<string>) used to detect binding state.
  let inner: Value<string>;
  if (props.paint) {
    if (!isFlatPaint(props.value)) return null; // gradient — bind disabled
    inner = props.value.color;
  } else {
    inner = props.value;
  }

  const bound = isParamRef(inner);
  if (bound) {
    const ref = inner as { $param: string };
    return (
      <button
        onClick={() => {
          const id = target.kind === "node" ? target.id : "artboard";
          unbind(id, field, props.fallback);
        }}
        title={`Unbind from {${ref.$param}}`}
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
          currentValue: typeof inner === "string" ? inner : "",
          paint: props.paint ?? false,
        })
      }
      title="Bind to a param"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
    >
      <Link2 className="h-3.5 w-3.5" />
    </button>
  );
}
