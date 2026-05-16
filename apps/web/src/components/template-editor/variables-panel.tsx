"use client";

import { Hash, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { useEditorConfig } from "./editor-config";
import {
  PARAM_KINDS,
  VALID_NAME,
  defaultPreview,
  makeEntry,
  parseRaw,
  uniqueName,
} from "./param-helpers";
import { useEditor } from "./store";
import type { ParamKind, ParamSchemaEntry, ParamsSchema, Value } from "./types";
import { isParamRef } from "./types";

export function VariablesPanel() {
  const { enableParams } = useEditorConfig();
  if (!enableParams) {
    return (
      <div className="p-4 text-[11px] text-zinc-500">
        Variables are not enabled for this editor.
      </div>
    );
  }
  return <VariablesPanelInner />;
}

function VariablesPanelInner() {
  const schema = useEditor((s) => s.paramsSchema);
  const addParam = useEditor((s) => s.addParam);
  const setParamDefault = useEditor((s) => s.setParamDefault);
  const removeParam = useEditor((s) => s.removeParam);
  const usage = useUsageCounts();

  const [creating, setCreating] = useState(false);

  const entries = useMemo(
    () => Object.entries(schema).sort(([a], [b]) => a.localeCompare(b)),
    [schema],
  );

  return (
    <div className="flex flex-col gap-2 p-3" data-tour="variables-panel">
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-tour="new-variable"
        onClick={() => setCreating((v) => !v)}
        className="w-full justify-start gap-1.5 text-xs"
      >
        <Plus className="h-3.5 w-3.5" />
        New variable
      </Button>

      {creating ? (
        <CreateForm
          schema={schema}
          onCancel={() => setCreating(false)}
          onCreate={(name, entry) => {
            addParam(name, entry);
            setCreating(false);
          }}
        />
      ) : null}

      {entries.length === 0 && !creating ? (
        <div className="rounded-md border border-dashed border-zinc-200 px-3 py-6 text-center text-[11px] text-zinc-500">
          No variables yet. Create one to expose a value for templating.
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {entries.map(([name, entry], i) => (
            <VariableRow
              key={name}
              name={name}
              entry={entry}
              tourAnchor={i === 0}
              usage={usage[name] ?? 0}
              onSetDefault={(v) => setParamDefault(name, v)}
              onDelete={() => removeParam(name)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function VariableRow({
  name,
  entry,
  usage,
  tourAnchor,
  onSetDefault,
  onDelete,
}: {
  name: string;
  entry: ParamSchemaEntry;
  usage: number;
  tourAnchor?: boolean;
  onSetDefault: (v: unknown) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = defaultPreview(entry);

  return (
    <li
      data-tour={tourAnchor ? "variable-row" : undefined}
      className={cn(
        "overflow-hidden rounded-md border bg-white",
        expanded ? "border-indigo-200" : "border-zinc-200",
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 text-left hover:bg-zinc-50"
      >
        <Hash className="h-3 w-3 shrink-0 text-indigo-400" />
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-zinc-800">
          {name}
        </span>
        <span className="shrink-0 rounded bg-zinc-100 px-1 py-px text-[9px] font-medium uppercase tracking-wide text-zinc-500">
          {entry.kind}
        </span>
        {preview.swatch ? (
          <span
            style={{ background: preview.swatch }}
            className="h-3 w-3 shrink-0 rounded border border-zinc-200"
            aria-hidden
          />
        ) : preview.text ? (
          <span className="max-w-[80px] shrink-0 truncate text-[10px] text-zinc-400">
            {preview.text}
          </span>
        ) : null}
      </button>
      {expanded ? (
        <div className="space-y-2 border-t border-zinc-100 p-2">
          <div className="flex items-center gap-1.5">
            <span className="w-12 shrink-0 text-[10px] uppercase tracking-wide text-zinc-400">
              Default
            </span>
            <div className="min-w-0 flex-1">
              <DefaultEditor key={name} entry={entry} onCommit={onSetDefault} />
            </div>
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[10px] text-zinc-400">
              {usage === 0
                ? "Not used yet"
                : usage === 1
                  ? "Used in 1 place"
                  : `Used in ${usage} places`}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="h-6 gap-1 px-2 text-[10px] text-zinc-500 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          </div>
        </div>
      ) : null}
    </li>
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
  if (kind === "string") {
    return (
      <Textarea
        value={v}
        onChange={(e) => {
          const next = e.target.value;
          setV(next);
          onCommit(parseRaw(kind, next));
        }}
        spellCheck={false}
        rows={2}
        className="min-h-14 resize-y px-1.5 py-1 font-mono text-[11px]"
      />
    );
  }
  return (
    <Input
      value={v}
      onChange={(e) => {
        const next = e.target.value;
        setV(next);
        onCommit(parseRaw(kind, next));
      }}
      spellCheck={false}
      className="h-7 px-1.5 font-mono text-[11px]"
    />
  );
}

function CreateForm({
  schema,
  onCancel,
  onCreate,
}: {
  schema: ParamsSchema;
  onCancel: () => void;
  onCreate: (name: string, entry: ParamSchemaEntry) => void;
}) {
  const [name, setName] = useState(() => uniqueName("param", schema));
  const [kind, setKind] = useState<ParamKind>("string");
  const [raw, setRaw] = useState("");

  const valid = VALID_NAME.test(name) && !(name in schema);

  const submit = () => {
    if (!valid) return;
    const entry = makeEntry(kind, raw);
    if (!entry) return;
    onCreate(name, entry);
  };

  return (
    <div
      className="space-y-2 rounded-md border border-indigo-200 bg-indigo-50/30 p-2"
      onKeyDown={(e) => {
        if (e.key === "Enter" && valid) {
          e.preventDefault();
          submit();
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
          className="h-7 px-1.5 font-mono text-[11px]"
        />
      </FormField>
      <FormField label="Kind">
        <Select value={kind} onValueChange={(v) => setKind(v as ParamKind)}>
          <SelectTrigger size="sm" className="h-7 w-full px-1.5 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PARAM_KINDS.map((k) => (
              <SelectItem key={k.value} value={k.value} className="text-[11px]">
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <FormField label="Default">
        <Input
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
            spellCheck={false}
          className="h-7 px-1.5 font-mono text-[11px]"
        />
      </FormField>
      <Button
        type="button"
        onClick={submit}
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
  children: React.ReactNode;
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

function useUsageCounts(): Record<string, number> {
  const nodes = useEditor((s) => s.nodes);
  const artboard = useEditor((s) => s.artboard);
  return useMemo(() => {
    const counts: Record<string, number> = {};
    const visit = (v: unknown) => {
      if (v == null) return;
      if (typeof v !== "object") return;
      if (isParamRef(v as Value<unknown>)) {
        const n = (v as { $param: string }).$param;
        counts[n] = (counts[n] ?? 0) + 1;
        return;
      }
      if (Array.isArray(v)) {
        v.forEach(visit);
        return;
      }
      for (const k of Object.keys(v))
        visit((v as Record<string, unknown>)[k]);
    };
    nodes.forEach(visit);
    visit(artboard);
    return counts;
  }, [nodes, artboard]);
}
