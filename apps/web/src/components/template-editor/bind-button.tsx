"use client";

import { Link2, Link2Off } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useEditorConfig } from "./editor-config";
import { useEditor } from "./store";
import type { Paint, ParamKind, ParamSchemaEntry, Value } from "./types";
import { isFlatPaint, isParamRef } from "./types";

export type BindTarget = { kind: "node"; id: string } | { kind: "artboard" };

type CommonProps = {
  target: BindTarget;
  field: string;
  paramKind: ParamKind;
};

type ValueProps = CommonProps & {
  paint?: false;
  value: Value<unknown>;
  fallback: unknown;
};

type PaintProps = CommonProps & {
  paint: true;
  value: Paint;
  fallback: Paint;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

const VALID_NAME = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export function BindButton(props: ValueProps | PaintProps) {
  const { target, field, paramKind } = props;
  const { enableParams } = useEditorConfig();
  const unbind = useEditor((s) => s.unbind);
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  if (!enableParams) return null;

  let inner: Value<unknown>;
  if (props.paint) {
    if (!isFlatPaint(props.value)) return null;
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

  const currentValue =
    typeof inner === "string"
      ? inner
      : inner === undefined || inner === null
        ? ""
        : String(inner);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        title="Bind to a param"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
      >
        <Link2 className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <BindPopover
          anchorRef={btnRef}
          field={field}
          paramKind={paramKind}
          currentValue={currentValue}
          onClose={() => setOpen(false)}
          onConfirm={(name, defaultStr) => {
            const entry = makeEntry(paramKind, defaultStr);
            if (!entry) return;
            const id = target.kind === "node" ? target.id : "artboard";
            useEditor
              .getState()
              .bindToParam(id, field, name, entry, props.paint);
            setOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function makeEntry(
  kind: ParamKind,
  raw: string,
): ParamSchemaEntry | null {
  switch (kind) {
    case "string":
    case "url":
    case "color": {
      const e: ParamSchemaEntry = { kind };
      if (raw) e.default = raw;
      return e;
    }
    case "number": {
      const e: ParamSchemaEntry = { kind: "number" };
      const n = Number(raw);
      if (Number.isFinite(n)) e.default = n;
      return e;
    }
    case "boolean": {
      const e: ParamSchemaEntry = { kind: "boolean" };
      if (raw === "true" || raw === "false") e.default = raw === "true";
      return e;
    }
    case "enum": {
      const values = raw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
      if (values.length === 0) return null;
      const [first, ...rest] = values;
      return { kind: "enum", values: [first!, ...rest] };
    }
  }
}

function BindPopover({
  anchorRef,
  field,
  paramKind,
  currentValue,
  onClose,
  onConfirm,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  field: string;
  paramKind: ParamKind;
  currentValue: string;
  onClose: () => void;
  onConfirm: (name: string, defaultStr: string) => void;
}) {
  const [name, setName] = useState(() => slugify(field) || "param");
  const [defaultStr, setDefaultStr] = useState(currentValue);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  useLayoutEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
  }, [anchorRef]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [anchorRef, onClose]);

  const valid = VALID_NAME.test(name);
  const submit = () => {
    if (!valid) return;
    onConfirm(name, defaultStr);
  };

  if (!pos) return null;

  return (
    <div
      ref={popRef}
      style={{ position: "fixed", top: pos.top, right: pos.right }}
      className="z-50 flex w-[220px] flex-col gap-1.5 rounded-lg border border-zinc-200 bg-white p-2 shadow-xl"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="w-12 shrink-0 text-[10px] uppercase tracking-wide text-zinc-400">
          name
        </span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          spellCheck={false}
          className="h-6 min-w-0 flex-1 rounded border border-transparent bg-zinc-50 px-1.5 font-mono text-[11px] outline-none focus:border-indigo-400 focus:bg-white"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-12 shrink-0 text-[10px] uppercase tracking-wide text-zinc-400">
          default
        </span>
        <input
          value={defaultStr}
          onChange={(e) => setDefaultStr(e.target.value)}
          placeholder={paramKind === "enum" ? "a, b, c" : ""}
          spellCheck={false}
          className="h-6 min-w-0 flex-1 rounded border border-transparent bg-zinc-50 px-1.5 font-mono text-[11px] outline-none focus:border-indigo-400 focus:bg-white"
        />
      </div>
      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={!valid}
          className="h-6 rounded bg-zinc-900 px-2.5 text-[11px] font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Bind
        </button>
      </div>
    </div>
  );
}
