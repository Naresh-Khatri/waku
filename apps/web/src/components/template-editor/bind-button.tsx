"use client";

import { Hash, Link2, Link2Off, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useEditorConfig } from "./editor-config";
import { useEditor } from "./store";
import type {
  Paint,
  ParamKind,
  ParamSchemaEntry,
  Value,
} from "./types";
import { isFlatPaint, isParamRef } from "./types";
import {
  VALID_NAME,
  defaultPreview,
  makeEntry,
  parseRaw,
  slugify,
  uniqueName,
} from "./param-helpers";

export type BindTarget = { kind: "node"; id: string } | { kind: "artboard" };

type CommonProps = {
  target: BindTarget;
  field: string;
  paramKind: ParamKind;
  children: ReactNode;
};
type ValueBindable = CommonProps & {
  paint?: false;
  value: Value<unknown>;
  fallback: unknown;
};
type PaintBindable = CommonProps & {
  paint: true;
  value: Paint;
  fallback: Paint;
};

export function Bindable(props: ValueBindable | PaintBindable) {
  const { enableParams } = useEditorConfig();
  if (!enableParams) return <>{props.children}</>;
  return <BindableInner {...props} />;
}

function BindableInner(props: ValueBindable | PaintBindable) {
  const inner: Value<unknown> | null = props.paint
    ? isFlatPaint(props.value)
      ? props.value.color
      : null
    : props.value;
  const bound = inner !== null && isParamRef(inner);
  const boundName = bound ? (inner as { $param: string }).$param : null;

  const currentRaw = useMemo(() => {
    if (bound) return "";
    if (inner === null || inner === undefined) return "";
    if (typeof inner === "string") return inner;
    return "";
  }, [bound, inner]);

  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={
                  bound && boundName
                    ? `Bound to {${boundName}}`
                    : "Bind to a variable"
                }
                aria-pressed={bound}
                className={cn(
                  "size-6 rounded-md transition-colors",
                  bound
                    ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700"
                    : "text-zinc-500 hover:bg-indigo-50 hover:text-indigo-600",
                )}
              >
                <Link2 className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            {bound && boundName ? `Bound to {${boundName}}` : "Bind to variable"}
          </TooltipContent>
        </Tooltip>
        <PopoverContent
          side="bottom"
          align="end"
          sideOffset={6}
          className="w-[260px] p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <PickerBody
            target={props.target}
            field={props.field}
            paramKind={props.paramKind}
            paint={!!props.paint}
            fallback={props.fallback}
            boundName={boundName}
            currentRaw={currentRaw}
            onClose={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
      {bound && boundName ? (
        <BoundPill name={boundName} onClick={() => setOpen((v) => !v)} />
      ) : (
        <div className="flex min-w-0 flex-1 items-center">{props.children}</div>
      )}
    </div>
  );
}

function BoundPill({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Bound to {${name}} — click to edit`}
      className="flex h-7 w-full min-w-0 items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-2 text-left font-mono text-[11px] text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100"
    >
      <Hash className="h-3 w-3 shrink-0 text-indigo-400" />
      <span className="min-w-0 flex-1 truncate">{name}</span>
    </button>
  );
}

function PickerBody({
  target,
  field,
  paramKind,
  paint,
  fallback,
  boundName,
  currentRaw,
  onClose,
}: {
  target: BindTarget;
  field: string;
  paramKind: ParamKind;
  paint: boolean;
  fallback: unknown;
  boundName: string | null;
  currentRaw: string;
  onClose: () => void;
}) {
  const paramsSchema = useEditor((s) => s.paramsSchema);
  const bindToParam = useEditor((s) => s.bindToParam);
  const unbind = useEditor((s) => s.unbind);
  const setParamDefault = useEditor((s) => s.setParamDefault);
  const removeParam = useEditor((s) => s.removeParam);

  const [mode, setMode] = useState<"list" | "create">("list");
  const [createName, setCreateName] = useState<string>(
    () => slugify(field) || "param",
  );

  const compatible = useMemo(
    () =>
      Object.entries(paramsSchema)
        .filter(([, e]) => e.kind === paramKind)
        .sort(([a], [b]) => a.localeCompare(b)),
    [paramsSchema, paramKind],
  );

  const targetId = target.kind === "node" ? target.id : "artboard";

  const pickExisting = (name: string) => {
    const entry = paramsSchema[name];
    if (!entry) return;
    bindToParam(targetId, field, name, entry, paint);
  };

  const unbindNow = () => {
    unbind(targetId, field, fallback);
    onClose();
  };

  const startCreate = (prefill?: string) => {
    setCreateName(
      uniqueName(prefill || slugify(field) || "param", paramsSchema),
    );
    setMode("create");
  };

  const boundEntry = (boundName ? paramsSchema[boundName] : null) ?? null;
  const totalParams = Object.keys(paramsSchema).length;

  if (mode === "create") {
    return (
      <CreateVariableForm
        paramKind={paramKind}
        suggestedName={createName}
        initialDefault={currentRaw}
        onCancel={() => setMode("list")}
        onCreate={(name, raw) => {
          const entry = makeEntry(paramKind, raw);
          if (!entry) return;
          bindToParam(targetId, field, name, entry, paint);
          onClose();
        }}
      />
    );
  }

  return (
    <ListBody
      boundEntry={boundEntry}
      boundName={boundName}
      compatible={compatible}
      paramKind={paramKind}
      totalParams={totalParams}
      onPick={pickExisting}
      onUnbind={unbindNow}
      onSetDefault={(v) => boundName && setParamDefault(boundName, v)}
      onRemoveParam={removeParam}
      onStartCreate={() => startCreate()}
    />
  );
}

function ListBody({
  boundEntry,
  boundName,
  compatible,
  paramKind,
  totalParams,
  onPick,
  onUnbind,
  onSetDefault,
  onRemoveParam,
  onStartCreate,
}: {
  boundEntry: ParamSchemaEntry | null;
  boundName: string | null;
  compatible: [string, ParamSchemaEntry][];
  paramKind: ParamKind;
  totalParams: number;
  onPick: (name: string) => void;
  onUnbind: () => void;
  onSetDefault: (v: unknown) => void;
  onRemoveParam: (name: string) => void;
  onStartCreate: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
        <span className="text-[11px] font-semibold text-zinc-700">
          {boundName ? "Bound variable" : "Bind to variable"}
        </span>
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-zinc-500">
          {paramKind}
        </span>
      </div>

      {boundEntry && boundName ? (
        <div className="flex items-center gap-1.5 border-b border-zinc-100 bg-indigo-50/40 px-2 py-1.5">
          <Hash className="h-3 w-3 shrink-0 text-indigo-400" />
          <span
            title={boundName}
            className="max-w-[80px] shrink-0 truncate font-mono text-[11px] text-indigo-700"
          >
            {boundName}
          </span>
          <div className="min-w-0 flex-1">
            <DefaultEditor
              key={boundName}
              entry={boundEntry}
              onCommit={onSetDefault}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onUnbind}
            aria-label="Unbind variable"
            className="text-indigo-400 hover:bg-rose-50 hover:text-rose-600"
          >
            <Link2Off className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}

      <ScrollArea className="max-h-[240px]">
        <div className="p-1">
          {compatible.length === 0 ? (
            <div className="px-2 py-4 text-center text-[11px] text-zinc-400">
              {totalParams > 0
                ? `No ${paramKind} variables yet.`
                : "No variables yet."}
            </div>
          ) : (
            compatible.map(([n, e]) => {
              const preview = defaultPreview(e);
              return (
                <VarRow
                  key={n}
                  name={n}
                  previewText={preview.text}
                  previewSwatch={preview.swatch}
                  selected={n === boundName}
                  onClick={() => onPick(n)}
                  onDelete={() => onRemoveParam(n)}
                />
              );
            })
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-zinc-100 p-1">
        <button
          type="button"
          onClick={onStartCreate}
          className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-[11px] font-medium text-indigo-600 hover:bg-indigo-50"
        >
          <Plus className="h-3.5 w-3.5 shrink-0" />
          <span>New {paramKind} variable</span>
        </button>
      </div>
    </>
  );
}

function VarRow({
  name,
  previewText,
  previewSwatch,
  selected,
  onClick,
  onDelete,
}: {
  name: string;
  previewText: string;
  previewSwatch?: string;
  selected?: boolean;
  onClick: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex w-full items-center gap-2 rounded px-2 py-1 text-[11px]",
        selected ? "bg-indigo-50" : "hover:bg-zinc-50",
      )}
    >
      {selected ? (
        <span className="absolute bottom-1 left-0 top-1 w-0.5 rounded-r bg-indigo-500" />
      ) : null}
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <Hash
          className={cn(
            "h-3 w-3 shrink-0",
            selected ? "text-indigo-500" : "text-indigo-400",
          )}
        />
        <span
          className={cn(
            "min-w-0 flex-1 truncate font-mono",
            selected ? "text-indigo-700" : "text-zinc-700",
          )}
        >
          {name}
        </span>
        {previewText || previewSwatch ? (
          <span className="flex max-w-[45%] shrink-0 items-center gap-1 text-[10px] text-zinc-400">
            {previewSwatch ? (
              <span
                style={{ background: previewSwatch }}
                className="h-2.5 w-2.5 shrink-0 rounded-sm border border-zinc-200"
              />
            ) : null}
            {previewText ? (
              <span className="min-w-0 truncate">{previewText}</span>
            ) : null}
          </span>
        ) : null}
      </button>
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          title="Delete variable"
          className="-ml-2 flex h-4 w-0 shrink-0 items-center justify-center overflow-hidden rounded text-zinc-300 transition-all duration-150 hover:bg-rose-50 hover:text-rose-600 group-hover:ml-0 group-hover:w-4 focus-visible:ml-0 focus-visible:w-4"
        >
          <Trash2 className="h-3 w-3 shrink-0" />
        </button>
      ) : null}
    </div>
  );
}

function DefaultEditor({
  entry,
  onCommit,
}: {
  entry: ParamSchemaEntry;
  onCommit: (v: unknown) => void;
}) {
  return (
    <CommitInput
      initial={entry.default ?? ""}
      kind={entry.kind}
      onCommit={onCommit}
    />
  );
}

function CommitInput({
  initial,
  kind,
  onCommit,
}: {
  initial: string;
  kind: ParamKind;
  onCommit: (v: unknown) => void;
}) {
  const [v, setV] = useState(initial);
  return (
    <Input
      value={v}
      onChange={(e) => {
        const next = e.target.value;
        setV(next);
        onCommit(parseRaw(kind, next));
      }}
      spellCheck={false}
      className="h-6 border-indigo-200 px-1.5 font-mono text-[11px]"
    />
  );
}

function CreateVariableForm({
  paramKind,
  suggestedName,
  initialDefault,
  onCancel,
  onCreate,
}: {
  paramKind: ParamKind;
  suggestedName: string;
  initialDefault: string;
  onCancel: () => void;
  onCreate: (name: string, raw: string) => void;
}) {
  const paramsSchema = useEditor((s) => s.paramsSchema);
  const [name, setName] = useState(() =>
    uniqueName(suggestedName, paramsSchema),
  );
  const [raw, setRaw] = useState(initialDefault);
  const valid = VALID_NAME.test(name) && !(name in paramsSchema);

  return (
    <div
      className="flex flex-col gap-2 p-2"
      onKeyDown={(e) => {
        if (e.key === "Enter" && valid) {
          e.preventDefault();
          onCreate(name, raw);
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-zinc-700">
          New variable
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onCancel}
          aria-label="Cancel"
          className="size-5 text-zinc-400 hover:text-zinc-700"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <FormField label="Name">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          spellCheck={false}
          className="h-6 px-1.5 font-mono text-[11px]"
        />
      </FormField>
      <FormField label="Default">
        <Input
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          spellCheck={false}
          className="h-6 px-1.5 font-mono text-[11px]"
        />
      </FormField>
      <Button
        type="button"
        onClick={() => onCreate(name, raw)}
        disabled={!valid}
        size="sm"
        className="w-full text-[11px]"
      >
        Create
      </Button>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-12 shrink-0 text-[10px] uppercase tracking-wide text-zinc-400">
        {label}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

