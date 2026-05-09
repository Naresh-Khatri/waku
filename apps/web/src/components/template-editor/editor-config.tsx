"use client";

import { createContext, useContext, type ReactNode } from "react";

interface EditorConfig {
  enableParams: boolean;
  liveUrl: string | null;
}

const Ctx = createContext<EditorConfig>({
  enableParams: false,
  liveUrl: null,
});

export function EditorConfigProvider({
  enableParams,
  liveUrl = null,
  children,
}: {
  enableParams: boolean;
  liveUrl?: string | null;
  children: ReactNode;
}) {
  return (
    <Ctx.Provider value={{ enableParams, liveUrl }}>{children}</Ctx.Provider>
  );
}

export const useEditorConfig = () => useContext(Ctx);
