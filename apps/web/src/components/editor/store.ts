"use client";

import type { Node, ParamRef, ParamSchemaEntry, ParamsSchema } from "@waku/ir";
import { create } from "zustand";

import {
  getNodeAt,
  insertChildAt,
  parentPath,
  removeNodeAt,
  replaceNodeAt,
  type NodePath,
} from "./path";

const HISTORY_LIMIT = 50;

export type EditorSnapshot = {
  ir: Node;
  paramsSchema: ParamsSchema;
};

export type EditorState = {
  ir: Node;
  paramsSchema: ParamsSchema;
  selection: NodePath[];
  draftValues: Record<string, unknown>;
  history: { past: EditorSnapshot[]; future: EditorSnapshot[] };
  dirty: boolean;
};

export type EditorActions = {
  // Selection
  select: (path: NodePath, additive?: boolean) => void;
  deselect: () => void;

  // Draft preview values
  setDraftValue: (name: string, value: unknown) => void;
  setDraftValues: (values: Record<string, unknown>) => void;

  // Tree mutations (each pushes history)
  setProp: <K extends keyof Node>(
    path: NodePath,
    key: K,
    value: Node[K],
  ) => void;
  setNode: (path: NodePath, next: Node) => void;
  addNode: (parent: NodePath, index: number, node: Node) => void;
  deleteNode: (path: NodePath) => void;

  // Param binding
  bindToParam: (
    path: NodePath,
    field: string,
    paramName: string,
    schema: ParamSchemaEntry,
  ) => void;
  unbind: (path: NodePath, field: string, fallback: unknown) => void;

  // History
  undo: () => void;
  redo: () => void;

  // Misc
  reset: (snapshot: EditorSnapshot) => void;
  markClean: () => void;
};

export type EditorStore = EditorState & EditorActions;

const snapshot = (s: Pick<EditorState, "ir" | "paramsSchema">): EditorSnapshot => ({
  ir: s.ir,
  paramsSchema: s.paramsSchema,
});

const pushHistory = (
  state: EditorState,
  next: Partial<EditorSnapshot>,
): Partial<EditorState> => {
  const past = [...state.history.past, snapshot(state)].slice(-HISTORY_LIMIT);
  return {
    history: { past, future: [] },
    dirty: true,
    ...next,
  };
};

export const createEditorStore = (initial: EditorSnapshot) =>
  create<EditorStore>((set, get) => ({
    ir: initial.ir,
    paramsSchema: initial.paramsSchema,
    selection: [],
    draftValues: {},
    history: { past: [], future: [] },
    dirty: false,

    select: (path, additive = false) =>
      set((s) => ({
        selection: additive
          ? s.selection.includes(path)
            ? s.selection.filter((p) => p !== path)
            : [...s.selection, path]
          : [path],
      })),

    deselect: () => set({ selection: [] }),

    setDraftValue: (name, value) =>
      set((s) => ({ draftValues: { ...s.draftValues, [name]: value } })),

    setDraftValues: (values) => set({ draftValues: values }),

    setProp: (path, key, value) =>
      set((s) => {
        const node = getNodeAt(s.ir, path);
        if (!node) return s;
        const next = { ...node, [key]: value } as Node;
        return pushHistory(s, { ir: replaceNodeAt(s.ir, path, next) });
      }),

    setNode: (path, next) =>
      set((s) => pushHistory(s, { ir: replaceNodeAt(s.ir, path, next) })),

    addNode: (parent, index, node) =>
      set((s) => pushHistory(s, { ir: insertChildAt(s.ir, parent, index, node) })),

    deleteNode: (path) =>
      set((s) => {
        if (path === "0") return s;
        const next = removeNodeAt(s.ir, path);
        const parent = parentPath(path);
        return pushHistory(s, { ir: next, ...(parent ? { selection: [parent] } : {}) });
      }),

    bindToParam: (path, field, paramName, schemaEntry) =>
      set((s) => {
        const node = getNodeAt(s.ir, path);
        if (!node) return s;
        const ref: ParamRef = { $param: paramName };
        const nextNode = { ...node, [field]: ref } as Node;
        const nextSchema: ParamsSchema = {
          ...s.paramsSchema,
          [paramName]: schemaEntry,
        };
        return pushHistory(s, {
          ir: replaceNodeAt(s.ir, path, nextNode),
          paramsSchema: nextSchema,
        });
      }),

    unbind: (path, field, fallback) =>
      set((s) => {
        const node = getNodeAt(s.ir, path);
        if (!node) return s;
        const nextNode = { ...node, [field]: fallback } as Node;
        return pushHistory(s, { ir: replaceNodeAt(s.ir, path, nextNode) });
      }),

    undo: () =>
      set((s) => {
        const last = s.history.past[s.history.past.length - 1];
        if (!last) return s;
        return {
          ir: last.ir,
          paramsSchema: last.paramsSchema,
          history: {
            past: s.history.past.slice(0, -1),
            future: [snapshot(s), ...s.history.future],
          },
          dirty: true,
        };
      }),

    redo: () =>
      set((s) => {
        const next = s.history.future[0];
        if (!next) return s;
        return {
          ir: next.ir,
          paramsSchema: next.paramsSchema,
          history: {
            past: [...s.history.past, snapshot(s)],
            future: s.history.future.slice(1),
          },
          dirty: true,
        };
      }),

    reset: (snap) => {
      const current = get();
      set({
        ir: snap.ir,
        paramsSchema: snap.paramsSchema,
        selection: [],
        draftValues: current.draftValues,
        history: { past: [], future: [] },
        dirty: false,
      });
    },

    markClean: () => set({ dirty: false }),
  }));

export type EditorStoreApi = ReturnType<typeof createEditorStore>;
