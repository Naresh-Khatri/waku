"use client";

import { create } from "zustand";
import type {
  Artboard,
  EditorNode,
  NodeType,
  ParamRef,
  ParamSchemaEntry,
  ParamsSchema,
  TemplateDocument,
  Value,
} from "./types";
import { flatPaint, isParamRef } from "./types";
import { DEFAULT_PATH_PRESET } from "./path-presets";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);

const TYPE_LABEL: Record<NodeType, string> = {
  image: "Image",
  text: "Text",
  rectangle: "Rectangle",
  ellipse: "Ellipse",
  triangle: "Triangle",
  star: "Star",
  line: "Line",
  path: "Path",
};

const SAMPLE_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=80";

export function createNode(
  type: NodeType,
  artboard: Artboard,
  count: number,
): EditorNode {
  const id = newId();
  const name = `${TYPE_LABEL[type]} ${count + 1}`;
  const cx = artboard.width / 2;
  const cy = artboard.height / 2;

  switch (type) {
    case "image":
      return {
        id,
        type,
        name,
        parentId: null,
        x: cx - 200,
        y: cy - 150,
        width: 400,
        height: 300,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        src: SAMPLE_IMAGE,
        fit: "cover",
        cornerRadius: 0,
        stroke: flatPaint("#000000"),
        strokeWidth: 0,
        shadow: null,
      };
    case "text":
      return {
        id,
        type,
        name,
        parentId: null,
        x: cx - 180,
        y: cy - 32,
        width: 360,
        height: 64,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        text: "Add your text",
        fontSize: 48,
        fontWeight: 600,
        italic: false,
        color: flatPaint("#111111"),
        align: "center",
        fontFamily: "Inter",
        letterSpacing: 0,
        lineHeight: 1.2,
      };
    case "rectangle":
      return {
        id,
        type,
        name,
        parentId: null,
        x: cx - 120,
        y: cy - 80,
        width: 240,
        height: 160,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        fill: flatPaint("#6366f1"),
        stroke: flatPaint("#000000"),
        strokeWidth: 0,
        cornerRadius: 16,
      };
    case "ellipse":
      return {
        id,
        type,
        name,
        parentId: null,
        x: cx - 100,
        y: cy - 100,
        width: 200,
        height: 200,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        fill: flatPaint("#ec4899"),
        stroke: flatPaint("#000000"),
        strokeWidth: 0,
      };
    case "triangle":
      return {
        id,
        type,
        name,
        parentId: null,
        x: cx - 110,
        y: cy - 95,
        width: 220,
        height: 190,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        fill: flatPaint("#10b981"),
        stroke: flatPaint("#000000"),
        strokeWidth: 0,
      };
    case "star":
      return {
        id,
        type,
        name,
        parentId: null,
        x: cx - 100,
        y: cy - 100,
        width: 200,
        height: 200,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        fill: flatPaint("#f59e0b"),
        stroke: flatPaint("#000000"),
        strokeWidth: 0,
        points: 5,
        innerRadiusRatio: 0.45,
      };
    case "line":
      return {
        id,
        type,
        name,
        parentId: null,
        x: cx - 150,
        y: cy - 16,
        width: 300,
        height: 32,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        stroke: flatPaint("#111111"),
        strokeWidth: 4,
        arrow: false,
      };
    case "path": {
      const p = DEFAULT_PATH_PRESET;
      return {
        id,
        type,
        name,
        parentId: null,
        x: cx - p.width / 2,
        y: cy - p.height / 2,
        width: p.width,
        height: p.height,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        fill: flatPaint("#ef4444"),
        stroke: flatPaint("#000000"),
        strokeWidth: 0,
        d: p.d,
        viewBox: p.viewBox,
      };
    }
  }
}

export interface Guide {
  axis: "x" | "y";
  position: number;
}

export interface DragSession {
  id: string;
  guides: Guide[];
}

export type Zoom = "fit" | number;

interface Snapshot {
  nodes: EditorNode[];
  artboard: Artboard;
  selectedId: string | null;
  nextCount: Record<NodeType, number>;
  paramsSchema: ParamsSchema;
}

const HISTORY_LIMIT = 100;
const COALESCE_MS = 500;

interface EditorState {
  artboard: Artboard;
  nodes: EditorNode[];
  selectedId: string | null;
  drag: DragSession | null;
  zoom: Zoom;
  nextCount: Record<NodeType, number>;

  paramsSchema: ParamsSchema;
  draftValues: Record<string, unknown>;
  previewOpen: boolean;

  past: Snapshot[];
  future: Snapshot[];
  lastOpKey: string | null;
  lastOpTime: number;

  dirty: boolean;

  clipboard: EditorNode | null;

  setArtboard: (patch: Partial<Artboard>) => void;
  addNode: (type: NodeType) => void;
  removeNode: (id: string) => void;
  updateNode: (id: string, patch: Partial<EditorNode>) => void;
  reorder: (sourceId: string, targetId: string) => void;
  duplicate: (id: string) => void;
  copyNode: (id: string) => void;
  paste: () => void;
  select: (id: string | null) => void;
  raise: (id: string) => void;
  lower: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  setDrag: (drag: DragSession | null) => void;
  setZoom: (zoom: Zoom) => void;

  bindToParam: (
    nodeId: string | "artboard",
    field: string,
    paramName: string,
    schemaEntry: ParamSchemaEntry,
    paint?: boolean,
  ) => void;
  unbind: (
    nodeId: string | "artboard",
    field: string,
    fallback: unknown,
  ) => void;
  setDraftValue: (name: string, value: unknown) => void;
  setDraftValues: (values: Record<string, unknown>) => void;
  setPreviewOpen: (open: boolean) => void;

  setParamDefault: (name: string, value: unknown) => void;
  removeParam: (name: string) => void;

  loadDocument: (doc: TemplateDocument) => void;
  getDocument: () => TemplateDocument;
  markClean: () => void;

  undo: () => void;
  redo: () => void;
  clearOpKey: () => void;
}

function snapshotOf(s: EditorState): Snapshot {
  return {
    nodes: s.nodes,
    artboard: s.artboard,
    selectedId: s.selectedId,
    nextCount: s.nextCount,
    paramsSchema: s.paramsSchema,
  };
}

function withHistory(s: EditorState, opKey: string): Partial<EditorState> {
  const now = Date.now();
  if (s.lastOpKey === opKey && now - s.lastOpTime < COALESCE_MS) {
    return { lastOpTime: now, dirty: true };
  }
  const past = [...s.past, snapshotOf(s)];
  if (past.length > HISTORY_LIMIT) past.shift();
  return {
    past,
    future: [],
    lastOpKey: opKey,
    lastOpTime: now,
    dirty: true,
  };
}

// Reads the raw value at a node/artboard field, unwrapping a flat-paint
// shell for color fields. Returns undefined if the field is already bound
// (no usable concrete value to snapshot) or the node is missing.
function readBoundField(
  s: { nodes: EditorNode[]; artboard: Artboard },
  nodeId: string | "artboard",
  field: string,
  paint?: boolean,
): unknown {
  const source =
    nodeId === "artboard"
      ? (s.artboard as unknown as Record<string, unknown>)
      : (s.nodes.find((n) => n.id === nodeId) as
          | unknown as Record<string, unknown>
          | undefined);
  if (!source) return undefined;
  const raw = source[field];
  if (
    paint &&
    raw &&
    typeof raw === "object" &&
    (raw as { kind?: string }).kind === "flat"
  ) {
    const inner = (raw as { color: unknown }).color;
    return isParamRef(inner as never) ? undefined : inner;
  }
  return isParamRef(raw as never) ? undefined : raw;
}

// Fills in a schema entry's `default` from a snapshot value when missing.
// Type-narrows the snapshot to the entry's kind — silently drops mismatches
// rather than corrupting the schema.
function ensureEntryDefault(
  entry: ParamSchemaEntry,
  current: unknown,
): ParamSchemaEntry {
  if ("default" in entry && entry.default !== undefined) return entry;
  if (current === undefined || current === null || current === "") return entry;
  switch (entry.kind) {
    case "string":
    case "url":
      return typeof current === "string" ? { ...entry, default: current } : entry;
    case "color":
      return typeof current === "string" && current.length > 0
        ? { ...entry, default: current }
        : entry;
    case "number":
      return typeof current === "number" && Number.isFinite(current)
        ? { ...entry, default: current }
        : entry;
    case "boolean":
      return typeof current === "boolean"
        ? { ...entry, default: current }
        : entry;
    case "enum":
      return typeof current === "string" && entry.values.includes(current)
        ? { ...entry, default: current }
        : entry;
  }
}

function defaultForEntry(entry: ParamSchemaEntry): unknown {
  if ("default" in entry && entry.default !== undefined) return entry.default;
  switch (entry.kind) {
    case "string":
    case "url":
      return "";
    case "color":
      return "#000000";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "enum":
      return entry.values[0];
  }
}

const ZERO_COUNT: Record<NodeType, number> = {
  image: 0,
  text: 0,
  rectangle: 0,
  ellipse: 0,
  triangle: 0,
  star: 0,
  line: 0,
  path: 0,
};

export const useEditor = create<EditorState>((set, get) => ({
  artboard: { width: 1200, height: 630, background: flatPaint("#ffffff") },
  nodes: [],
  selectedId: null,
  drag: null,
  zoom: "fit",
  nextCount: { ...ZERO_COUNT },

  paramsSchema: {},
  draftValues: {},
  previewOpen: false,

  past: [],
  future: [],
  lastOpKey: null,
  lastOpTime: 0,

  dirty: false,

  clipboard: null,

  setArtboard: (patch) =>
    set((s) => ({
      ...withHistory(s, `artboard-${Object.keys(patch).sort().join(",")}`),
      artboard: { ...s.artboard, ...patch },
    })),

  addNode: (type) =>
    set((s) => {
      const node = createNode(type, s.artboard, s.nextCount[type]);
      return {
        ...withHistory(s, `add-${node.id}`),
        nodes: [...s.nodes, node],
        selectedId: node.id,
        nextCount: { ...s.nextCount, [type]: s.nextCount[type] + 1 },
      };
    }),

  removeNode: (id) =>
    set((s) => ({
      ...withHistory(s, `remove-${id}`),
      nodes: s.nodes.filter((n) => n.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  updateNode: (id, patch) =>
    set((s) => {
      const keys = Object.keys(patch).sort().join(",");
      return {
        ...withHistory(s, `update-${id}-${keys}`),
        nodes: s.nodes.map((n) =>
          n.id === id ? ({ ...n, ...patch } as EditorNode) : n,
        ),
      };
    }),

  reorder: (sourceId, targetId) =>
    set((s) => {
      if (sourceId === targetId) return s;
      const from = s.nodes.findIndex((n) => n.id === sourceId);
      const to = s.nodes.findIndex((n) => n.id === targetId);
      if (from === -1 || to === -1) return s;
      const next = [...s.nodes];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return {
        ...withHistory(s, `reorder-${sourceId}`),
        nodes: next,
      };
    }),

  duplicate: (id) =>
    set((s) => {
      const idx = s.nodes.findIndex((n) => n.id === id);
      if (idx === -1) return s;
      const orig = s.nodes[idx]!;
      const copy: EditorNode = {
        ...orig,
        id: newId(),
        name: `${orig.name} copy`,
        x: orig.x + 24,
        y: orig.y + 24,
      };
      const next = [...s.nodes];
      next.splice(idx + 1, 0, copy);
      return {
        ...withHistory(s, `duplicate-${id}-${copy.id}`),
        nodes: next,
        selectedId: copy.id,
      };
    }),

  copyNode: (id) => {
    const node = get().nodes.find((n) => n.id === id);
    if (!node) return;
    set({ clipboard: node });
  },

  paste: () =>
    set((s) => {
      if (!s.clipboard) return s;
      const orig = s.clipboard;
      const copy: EditorNode = {
        ...orig,
        id: newId(),
        name: `${orig.name} copy`,
        x: orig.x + 24,
        y: orig.y + 24,
      };
      return {
        ...withHistory(s, `paste-${copy.id}`),
        nodes: [...s.nodes, copy],
        selectedId: copy.id,
      };
    }),

  select: (id) => set({ selectedId: id }),

  raise: (id) =>
    set((s) => {
      const idx = s.nodes.findIndex((n) => n.id === id);
      if (idx === -1 || idx === s.nodes.length - 1) return s;
      const next = [...s.nodes];
      [next[idx], next[idx + 1]] = [next[idx + 1]!, next[idx]!];
      return {
        ...withHistory(s, `raise-${id}-${idx}`),
        nodes: next,
      };
    }),

  lower: (id) =>
    set((s) => {
      const idx = s.nodes.findIndex((n) => n.id === id);
      if (idx <= 0) return s;
      const next = [...s.nodes];
      [next[idx - 1], next[idx]] = [next[idx]!, next[idx - 1]!];
      return {
        ...withHistory(s, `lower-${id}-${idx}`),
        nodes: next,
      };
    }),

  bringToFront: (id) =>
    set((s) => {
      const idx = s.nodes.findIndex((n) => n.id === id);
      if (idx === -1) return s;
      const next = [...s.nodes];
      const [moved] = next.splice(idx, 1);
      next.push(moved!);
      return {
        ...withHistory(s, `bringToFront-${id}`),
        nodes: next,
      };
    }),

  sendToBack: (id) =>
    set((s) => {
      const idx = s.nodes.findIndex((n) => n.id === id);
      if (idx === -1) return s;
      const next = [...s.nodes];
      const [moved] = next.splice(idx, 1);
      next.unshift(moved!);
      return {
        ...withHistory(s, `sendToBack-${id}`),
        nodes: next,
      };
    }),

  setDrag: (drag) => set({ drag }),

  setZoom: (zoom) => set({ zoom }),

  bindToParam: (nodeId, field, paramName, schemaEntry, paint) =>
    set((s) => {
      // Snapshot the field's pre-bind value into both the schema default and
      // the ref's own `default` — the schema feeds `paramsWithDefaults` (URL
      // builder + server-side draft merge), the ref-level default is what
      // `resolveValue` reads as a last resort. Belt + suspenders so bound
      // fields never render blank purely because no draft value was provided.
      const currentValue = readBoundField(s, nodeId, field, paint);
      const ref: ParamRef<string> = { $param: paramName };
      if (typeof currentValue === "string" && currentValue.length > 0) {
        ref.default = currentValue;
      }
      const fieldValue = paint ? flatPaint(ref) : ref;
      const finalEntry = ensureEntryDefault(schemaEntry, currentValue);
      const nextSchema: ParamsSchema = {
        ...s.paramsSchema,
        [paramName]: finalEntry,
      };
      if (nodeId === "artboard") {
        return {
          ...withHistory(s, `bind-artboard-${field}-${paramName}`),
          artboard: { ...s.artboard, [field]: fieldValue },
          paramsSchema: nextSchema,
        };
      }
      return {
        ...withHistory(s, `bind-${nodeId}-${field}-${paramName}`),
        nodes: s.nodes.map((n) =>
          n.id === nodeId ? { ...n, [field]: fieldValue } : n,
        ),
        paramsSchema: nextSchema,
      };
    }),

  unbind: (nodeId, field, fallback) =>
    set((s) => {
      if (nodeId === "artboard") {
        return {
          ...withHistory(s, `unbind-artboard-${field}`),
          artboard: { ...s.artboard, [field]: fallback },
        };
      }
      return {
        ...withHistory(s, `unbind-${nodeId}-${field}`),
        nodes: s.nodes.map((n) =>
          n.id === nodeId ? { ...n, [field]: fallback } : n,
        ),
      };
    }),

  setDraftValue: (name, value) =>
    set((s) => ({ draftValues: { ...s.draftValues, [name]: value } })),

  setDraftValues: (values) => set({ draftValues: values }),

  setPreviewOpen: (open) => set({ previewOpen: open }),

  setParamDefault: (name, value) =>
    set((s) => {
      const entry = s.paramsSchema[name];
      if (!entry) return s;
      let nextEntry: ParamSchemaEntry;
      switch (entry.kind) {
        case "string":
        case "url":
        case "color":
          nextEntry = { ...entry, default: typeof value === "string" ? value : "" };
          break;
        case "number": {
          const n = typeof value === "number" ? value : Number(value);
          nextEntry = { ...entry, default: Number.isFinite(n) ? n : 0 };
          break;
        }
        case "boolean":
          nextEntry = { ...entry, default: Boolean(value) };
          break;
        case "enum":
          nextEntry = {
            ...entry,
            default:
              typeof value === "string" && entry.values.includes(value)
                ? value
                : entry.values[0],
          };
          break;
      }
      return {
        ...withHistory(s, `param-default-${name}`),
        paramsSchema: { ...s.paramsSchema, [name]: nextEntry },
      };
    }),

  removeParam: (name) =>
    set((s) => {
      const entry = s.paramsSchema[name];
      if (!entry) return s;
      const { [name]: _drop, ...rest } = s.paramsSchema;
      const replacement = defaultForEntry(entry);
      const stripValue = <T,>(v: unknown): unknown =>
        isParamRef(v as Value<T>) && (v as { $param: string }).$param === name
          ? replacement
          : v;
      const stripPaint = (p: unknown): unknown => {
        if (
          p &&
          typeof p === "object" &&
          (p as { kind?: string }).kind === "flat"
        ) {
          const fp = p as { kind: "flat"; color: unknown };
          if (
            isParamRef(fp.color as Value<string>) &&
            (fp.color as { $param: string }).$param === name
          ) {
            return flatPaint(typeof replacement === "string" ? replacement : "#000000");
          }
        }
        return p;
      };
      const stripObj = (o: Record<string, unknown>): Record<string, unknown> => {
        const out: Record<string, unknown> = { ...o };
        for (const k of Object.keys(out)) {
          out[k] = stripPaint(stripValue(out[k]));
        }
        return out;
      };
      const nodes = s.nodes.map(
        (n) => stripObj(n as unknown as Record<string, unknown>) as unknown as EditorNode,
      );
      const artboard = stripObj(
        s.artboard as unknown as Record<string, unknown>,
      ) as unknown as Artboard;
      const nextDraft = { ...s.draftValues };
      delete nextDraft[name];
      return {
        ...withHistory(s, `remove-param-${name}`),
        paramsSchema: rest,
        nodes,
        artboard,
        draftValues: nextDraft,
      };
    }),

  loadDocument: (doc) =>
    set({
      artboard: doc.artboard,
      nodes: doc.nodes,
      paramsSchema: doc.paramsSchema,
      selectedId: null,
      nextCount: { ...ZERO_COUNT },
      past: [],
      future: [],
      lastOpKey: null,
      lastOpTime: 0,
      dirty: false,
    }),

  getDocument: () => {
    const s = get();
    return {
      artboard: s.artboard,
      nodes: s.nodes,
      paramsSchema: s.paramsSchema,
    };
  },

  markClean: () => set({ dirty: false }),

  undo: () => {
    const s = get();
    if (s.past.length === 0) return;
    const past = [...s.past];
    const prev = past.pop()!;
    set({
      past,
      future: [...s.future, snapshotOf(s)],
      nodes: prev.nodes,
      artboard: prev.artboard,
      selectedId: prev.selectedId,
      nextCount: prev.nextCount,
      paramsSchema: prev.paramsSchema,
      lastOpKey: null,
      lastOpTime: 0,
      dirty: true,
    });
  },

  redo: () => {
    const s = get();
    if (s.future.length === 0) return;
    const future = [...s.future];
    const next = future.pop()!;
    set({
      past: [...s.past, snapshotOf(s)],
      future,
      nodes: next.nodes,
      artboard: next.artboard,
      selectedId: next.selectedId,
      nextCount: next.nextCount,
      paramsSchema: next.paramsSchema,
      lastOpKey: null,
      lastOpTime: 0,
      dirty: true,
    });
  },

  clearOpKey: () => set({ lastOpKey: null, lastOpTime: 0 }),
}));

export type { Value };
