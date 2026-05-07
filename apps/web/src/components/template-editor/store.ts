"use client";

import { create } from "zustand";
import type { Artboard, EditorNode, NodeType } from "./types";

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
      };
    case "text":
      return {
        id,
        type,
        name,
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
        color: "#111111",
        align: "center",
        fontFamily: "var(--font-geist-sans)",
        letterSpacing: 0,
        lineHeight: 1.2,
      };
    case "rectangle":
      return {
        id,
        type,
        name,
        x: cx - 120,
        y: cy - 80,
        width: 240,
        height: 160,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        fill: "#6366f1",
        stroke: "#000000",
        strokeWidth: 0,
        cornerRadius: 16,
      };
    case "ellipse":
      return {
        id,
        type,
        name,
        x: cx - 100,
        y: cy - 100,
        width: 200,
        height: 200,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        fill: "#ec4899",
        stroke: "#000000",
        strokeWidth: 0,
      };
    case "triangle":
      return {
        id,
        type,
        name,
        x: cx - 110,
        y: cy - 95,
        width: 220,
        height: 190,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        fill: "#10b981",
        stroke: "#000000",
        strokeWidth: 0,
      };
    case "star":
      return {
        id,
        type,
        name,
        x: cx - 100,
        y: cy - 100,
        width: 200,
        height: 200,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        fill: "#f59e0b",
        stroke: "#000000",
        strokeWidth: 0,
        points: 5,
        innerRadiusRatio: 0.45,
      };
    case "line":
      return {
        id,
        type,
        name,
        x: cx - 150,
        y: cy - 16,
        width: 300,
        height: 32,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        stroke: "#111111",
        strokeWidth: 4,
        arrow: false,
      };
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

  past: Snapshot[];
  future: Snapshot[];
  lastOpKey: string | null;
  lastOpTime: number;

  setArtboard: (patch: Partial<Artboard>) => void;
  addNode: (type: NodeType) => void;
  removeNode: (id: string) => void;
  updateNode: (id: string, patch: Partial<EditorNode>) => void;
  reorder: (sourceId: string, targetId: string) => void;
  duplicate: (id: string) => void;
  select: (id: string | null) => void;
  raise: (id: string) => void;
  lower: (id: string) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  setDrag: (drag: DragSession | null) => void;
  setZoom: (zoom: Zoom) => void;

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
  };
}

function withHistory(s: EditorState, opKey: string): Partial<EditorState> {
  const now = Date.now();
  if (s.lastOpKey === opKey && now - s.lastOpTime < COALESCE_MS) {
    return { lastOpTime: now };
  }
  const past = [...s.past, snapshotOf(s)];
  if (past.length > HISTORY_LIMIT) past.shift();
  return {
    past,
    future: [],
    lastOpKey: opKey,
    lastOpTime: now,
  };
}

export const useEditor = create<EditorState>((set, get) => ({
  artboard: { width: 1200, height: 630, background: "#ffffff" },
  nodes: [],
  selectedId: null,
  drag: null,
  zoom: "fit",
  nextCount: {
    image: 0,
    text: 0,
    rectangle: 0,
    ellipse: 0,
    triangle: 0,
    star: 0,
    line: 0,
  },

  past: [],
  future: [],
  lastOpKey: null,
  lastOpTime: 0,

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
      lastOpKey: null,
      lastOpTime: 0,
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
      lastOpKey: null,
      lastOpTime: 0,
    });
  },

  clearOpKey: () => set({ lastOpKey: null, lastOpTime: 0 }),
}));
