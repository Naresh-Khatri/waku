"use client";

import { useEffect, useState } from "react";
import { useEditor } from "./store";
import type { ParamKind, ParamSchemaEntry } from "./types";

export type BindTarget =
  | { kind: "node"; id: string }
  | { kind: "artboard" };

export interface BindRequest {
  target: BindTarget;
  field: string;
  paramKind: ParamKind;
  currentValue: string;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

const VALID_NAME = /^[a-zA-Z][a-zA-Z0-9_-]*$/;

export function BindParamModal({
  request,
  onClose,
}: {
  request: BindRequest | null;
  onClose: () => void;
}) {
  const paramsSchema = useEditor((s) => s.paramsSchema);
  const bindToParam = useEditor((s) => s.bindToParam);
  const [name, setName] = useState("");
  const [defaultStr, setDefaultStr] = useState("");
  const [maxLen, setMaxLen] = useState("");
  const [enumValues, setEnumValues] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!request) return;
    setName(slugify(request.field) || "param");
    setDefaultStr(request.currentValue ?? "");
    setMaxLen("");
    setEnumValues("");
    setError(null);
  }, [request]);

  if (!request) return null;
  const reuseExisting = paramsSchema[name];

  const submit = () => {
    if (!name) {
      setError("name required");
      return;
    }
    if (!VALID_NAME.test(name)) {
      setError("name must start with a letter; only letters, digits, _ and -");
      return;
    }

    let entry: ParamSchemaEntry;
    if (reuseExisting) {
      entry = reuseExisting;
    } else {
      switch (request.paramKind) {
        case "string": {
          const e: ParamSchemaEntry = { kind: "string" };
          if (defaultStr.length > 0) e.default = defaultStr;
          const ml = Number(maxLen);
          if (Number.isFinite(ml) && ml > 0) e.maxLen = ml;
          entry = e;
          break;
        }
        case "url": {
          const e: ParamSchemaEntry = { kind: "url" };
          if (defaultStr.length > 0) e.default = defaultStr;
          entry = e;
          break;
        }
        case "color": {
          const e: ParamSchemaEntry = { kind: "color" };
          if (defaultStr.length > 0) e.default = defaultStr;
          entry = e;
          break;
        }
        case "number": {
          const e: ParamSchemaEntry = { kind: "number" };
          const dv = Number(defaultStr);
          if (Number.isFinite(dv)) e.default = dv;
          entry = e;
          break;
        }
        case "boolean": {
          const e: ParamSchemaEntry = { kind: "boolean" };
          if (defaultStr === "true" || defaultStr === "false") {
            e.default = defaultStr === "true";
          }
          entry = e;
          break;
        }
        case "enum": {
          const values = enumValues
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
          if (values.length === 0) {
            setError("enum requires at least one value");
            return;
          }
          const [first, ...rest] = values;
          const e: ParamSchemaEntry = {
            kind: "enum",
            values: [first!, ...rest],
          };
          if (defaultStr) e.default = defaultStr;
          entry = e;
          break;
        }
      }
    }

    const targetId = request.target.kind === "node" ? request.target.id : "artboard";
    bindToParam(targetId, request.field, name, entry);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-black/40"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[380px] rounded-xl border border-zinc-200 bg-white p-4 shadow-2xl"
      >
        <div className="mb-3 text-sm font-semibold text-zinc-800">
          Bind {request.field} to a param
        </div>

        <Field label="Param name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
          />
          {reuseExisting ? (
            <div className="mt-1 text-[10px] text-indigo-600">
              Reusing existing param ({reuseExisting.kind})
            </div>
          ) : null}
        </Field>

        <Field label="Kind">
          <input
            value={reuseExisting?.kind ?? request.paramKind}
            disabled
            className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs text-zinc-500"
          />
        </Field>

        {!reuseExisting ? (
          <>
            <Field label="Default">
              <input
                value={defaultStr}
                onChange={(e) => setDefaultStr(e.target.value)}
                className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
              />
            </Field>
            {request.paramKind === "string" ? (
              <Field label="Max length">
                <input
                  type="number"
                  value={maxLen}
                  onChange={(e) => setMaxLen(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
                />
              </Field>
            ) : null}
            {request.paramKind === "enum" ? (
              <Field label="Values">
                <input
                  value={enumValues}
                  onChange={(e) => setEnumValues(e.target.value)}
                  placeholder="comma-separated"
                  className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
                />
              </Field>
            ) : null}
          </>
        ) : null}

        {error ? (
          <div className="mb-2 text-[11px] text-rose-600">{error}</div>
        ) : null}

        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
          >
            Bind
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2.5">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      {children}
    </div>
  );
}
