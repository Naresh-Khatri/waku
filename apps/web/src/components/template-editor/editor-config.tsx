"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { BindRequest } from "./bind-param-modal";

interface EditorConfig {
  enableParams: boolean;
  openBindModal: ((req: BindRequest) => void) | null;
  liveUrl: string | null;
}

const Ctx = createContext<EditorConfig>({
  enableParams: false,
  openBindModal: null,
  liveUrl: null,
});

export function EditorConfigProvider({
  enableParams,
  openBindModal,
  liveUrl = null,
  children,
}: {
  enableParams: boolean;
  openBindModal: ((req: BindRequest) => void) | null;
  liveUrl?: string | null;
  children: ReactNode;
}) {
  return (
    <Ctx.Provider value={{ enableParams, openBindModal, liveUrl }}>
      {children}
    </Ctx.Provider>
  );
}

export const useEditorConfig = () => useContext(Ctx);
