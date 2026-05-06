"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { ParamSchemaEntry } from "@waku/ir";

import type { FieldKind } from "./Inspector";
import type { NodePath } from "./path";
import { useEditorStore } from "./StoreProvider";

export type BindRequest = {
  path: NodePath;
  field: string;
  kind: FieldKind;
  currentValue: unknown;
};

const inputBase: CSSProperties = {
  width: "100%",
  background: "#0b0f1a",
  color: "#e5e7eb",
  border: "1px solid #1f2937",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 12,
  fontFamily: "inherit",
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

const defaultName = (req: BindRequest): string => {
  const base = `${req.path === "0" ? "" : req.path.split(".").slice(-1)[0] + "-"}${req.field}`;
  return slugify(base) || "param";
};

const literalDefault = (req: BindRequest): unknown => {
  if (typeof req.currentValue === "string" || typeof req.currentValue === "number" || typeof req.currentValue === "boolean") {
    return req.currentValue;
  }
  switch (req.kind) {
    case "string":
    case "url":
    case "color":
      return "";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "enum":
      return "";
  }
};

export function BindParamModal({
  request,
  onClose,
}: {
  request: BindRequest | null;
  onClose: () => void;
}) {
  const paramsSchema = useEditorStore((s) => s.paramsSchema);
  const bindToParam = useEditorStore((s) => s.bindToParam);

  const [name, setName] = useState("");
  const [defaultStr, setDefaultStr] = useState("");
  const [maxLen, setMaxLen] = useState<string>("");
  const [enumValues, setEnumValues] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!request) return;
    setName(defaultName(request));
    setDefaultStr(String(literalDefault(request)));
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
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      setError("name must start with a letter; only letters, digits, _ and -");
      return;
    }

    let entry: ParamSchemaEntry;
    if (reuseExisting) {
      // re-use the existing schema; defaults/constraints come from there
      entry = reuseExisting;
    } else {
      switch (request.kind) {
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

    bindToParam(request.path, request.field, name, entry);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000a",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 380,
          background: "#0b0f1a",
          border: "1px solid #1f2937",
          borderRadius: 12,
          padding: 16,
          color: "#e5e7eb",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          Bind {request.field} → param
        </div>

        <Field label="param name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputBase}
            autoFocus
          />
          {reuseExisting && (
            <div style={{ fontSize: 11, color: "#7c5cff", marginTop: 4 }}>
              Reusing existing param ({reuseExisting.kind})
            </div>
          )}
        </Field>

        <Field label="kind">
          <input
            value={reuseExisting?.kind ?? request.kind}
            disabled
            style={{ ...inputBase, opacity: 0.6 }}
          />
        </Field>

        {!reuseExisting && (
          <>
            <Field label="default">
              <input
                value={defaultStr}
                onChange={(e) => setDefaultStr(e.target.value)}
                style={inputBase}
              />
            </Field>

            {request.kind === "string" && (
              <Field label="maxLen">
                <input
                  value={maxLen}
                  onChange={(e) => setMaxLen(e.target.value)}
                  type="number"
                  style={inputBase}
                />
              </Field>
            )}

            {request.kind === "enum" && (
              <Field label="values">
                <input
                  value={enumValues}
                  onChange={(e) => setEnumValues(e.target.value)}
                  placeholder="comma-separated"
                  style={inputBase}
                />
              </Field>
            )}
          </>
        )}

        {error && (
          <div style={{ color: "#ef4444", fontSize: 11, marginTop: 8 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button
            onClick={onClose}
            style={{
              fontSize: 12,
              background: "transparent",
              color: "#9ca3af",
              border: "1px solid #1f2937",
              borderRadius: 6,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            cancel
          </button>
          <button
            onClick={submit}
            style={{
              fontSize: 12,
              background: "#7c5cff",
              color: "white",
              border: "none",
              borderRadius: 6,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            bind
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: "#9ca3af",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
