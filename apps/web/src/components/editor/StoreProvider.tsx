"use client";

import { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";

import {
  createEditorStore,
  type EditorSnapshot,
  type EditorStore,
  type EditorStoreApi,
} from "./store";

const EditorStoreContext = createContext<EditorStoreApi | null>(null);

export function EditorStoreProvider({
  initial,
  children,
}: {
  initial: EditorSnapshot;
  children: ReactNode;
}) {
  const ref = useRef<EditorStoreApi | null>(null);
  if (!ref.current) {
    ref.current = createEditorStore(initial);
  }
  return (
    <EditorStoreContext.Provider value={ref.current}>
      {children}
    </EditorStoreContext.Provider>
  );
}

export function useEditorStore<T>(selector: (state: EditorStore) => T): T {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("useEditorStore outside <EditorStoreProvider>");
  return useStore(store, selector);
}

export function useEditorStoreApi(): EditorStoreApi {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error("useEditorStoreApi outside <EditorStoreProvider>");
  return store;
}
