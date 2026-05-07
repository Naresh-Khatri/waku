"use client";

import { useMemo, useState, type CSSProperties } from "react";
import type { Node, ParamRef, ParamSchemaEntry, ParamsSchema } from "@waku/ir";
import { isParamRef } from "@waku/ir";

import { useEditorStore } from "./StoreProvider";
import type { NodePath } from "./path";

type Reference = { path: NodePath; field: string };

const inputBase: CSSProperties = {
  width: "100%",
  background: "#0b0f1a",
  color: "#e5e7eb",
  border: "1px solid #1f2937",
  borderRadius: 6,
  padding: "4px 6px",
  fontSize: 11,
  fontFamily: "inherit",
};

const collectReferences = (
  ir: Node,
  schema: ParamsSchema,
): Map<string, Reference[]> => {
  const out = new Map<string, Reference[]>();
  for (const name of Object.keys(schema)) out.set(name, []);
  const visit = (node: Node, path: NodePath) => {
    for (const [field, value] of Object.entries(node)) {
      if (isParamRef(value)) {
        const list = out.get((value as ParamRef).$param) ?? [];
        list.push({ path, field });
        out.set((value as ParamRef).$param, list);
      }
    }
    if (node.type === "frame" || node.type === "stack") {
      const children = node.children ?? [];
      children.forEach((c, i) => visit(c, `${path}.children.${i}`));
    }
  };
  visit(ir, "0");
  return out;
};

export function ParamsPanel() {
  const ir = useEditorStore((s) => s.ir);
  const schema = useEditorStore((s) => s.paramsSchema);
  const draftValues = useEditorStore((s) => s.draftValues);
  const setDraftValue = useEditorStore((s) => s.setDraftValue);
  const select = useEditorStore((s) => s.select);

  const refs = useMemo(() => collectReferences(ir, schema), [ir, schema]);
  const entries = Object.entries(schema);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: "#9ca3af",
          borderBottom: "1px solid #1f2937",
        }}
      >
        Params {entries.length > 0 && <span style={{ color: "#6b7280", textTransform: "none" }}>({entries.length})</span>}
      </div>
      <div style={{ overflowY: "auto", flex: 1 }}>
        {entries.length === 0 && (
          <div
            style={{
              padding: 16,
              fontSize: 11,
              color: "#6b7280",
              textAlign: "center",
            }}
          >
            No params yet. Click the chain icon next to a property to bind one.
          </div>
        )}
        {entries.map(([name, entry]) => (
          <ParamRow
            key={name}
            name={name}
            entry={entry}
            references={refs.get(name) ?? []}
            value={draftValues[name]}
            onSetMock={(v) => setDraftValue(name, v)}
            onJump={(path) => select(path)}
          />
        ))}
      </div>
    </div>
  );
}

function ParamRow({
  name,
  entry,
  references,
  value,
  onSetMock,
  onJump,
}: {
  name: string;
  entry: ParamSchemaEntry;
  references: Reference[];
  value: unknown;
  onSetMock: (v: unknown) => void;
  onJump: (path: NodePath) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #1f2937", padding: "8px 12px" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          background: "transparent",
          border: "none",
          color: "#e5e7eb",
          padding: 0,
          cursor: "pointer",
          fontFamily: "monospace",
          fontSize: 12,
        }}
      >
        <span>{name}</span>
        <span style={{ fontSize: 10, color: "#6b7280" }}>
          {entry.kind} · {references.length} ref
        </span>
      </button>
      {open && (
        <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
          <ValueEditor entry={entry} value={value} onChange={onSetMock} />
          {references.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {references.map((r, i) => (
                <button
                  key={i}
                  onClick={() => onJump(r.path)}
                  title={`${r.path} · ${r.field}`}
                  style={{
                    fontSize: 10,
                    background: "#7c5cff22",
                    color: "#c4b5fd",
                    border: "1px solid #7c5cff66",
                    borderRadius: 4,
                    padding: "2px 6px",
                    cursor: "pointer",
                    fontFamily: "monospace",
                  }}
                >
                  {r.field}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 10, color: "#6b7280" }}>unused</div>
          )}
        </div>
      )}
    </div>
  );
}

function ValueEditor({
  entry,
  value,
  onChange,
}: {
  entry: ParamSchemaEntry;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (entry.kind) {
    case "string":
    case "url":
      return (
        <input
          value={typeof value === "string" ? value : ""}
          placeholder={entry.default ?? ""}
          onChange={(e) => onChange(e.target.value)}
          style={inputBase}
        />
      );
    case "color":
      return (
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            type="color"
            value={typeof value === "string" && value.startsWith("#") ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            style={{
              width: 22,
              height: 22,
              padding: 0,
              background: "transparent",
              border: "1px solid #1f2937",
              borderRadius: 4,
            }}
          />
          <input
            value={typeof value === "string" ? value : ""}
            onChange={(e) => onChange(e.target.value)}
            style={{ ...inputBase, flex: 1 }}
          />
        </div>
      );
    case "number":
      return (
        <input
          type="number"
          value={typeof value === "number" ? value : ""}
          placeholder={entry.default !== undefined ? String(entry.default) : ""}
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            if (Number.isFinite(n)) onChange(n);
          }}
          style={inputBase}
        />
      );
    case "boolean":
      return (
        <select
          value={value === true ? "true" : value === false ? "false" : ""}
          onChange={(e) => onChange(e.target.value === "true")}
          style={inputBase}
        >
          <option value="">—</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    case "enum":
      return (
        <select
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          style={inputBase}
        >
          <option value="">—</option>
          {entry.values.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );
  }
}
