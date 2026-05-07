"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { BindRequest } from "./bind-param-modal";

interface EditorConfig {
  enableParams: boolean;
  openBindModal: ((req: BindRequest) => void) | null;
}

const Ctx = createContext<EditorConfig>({
  enableParams: false,
  openBindModal: null,
});

export function EditorConfigProvider({
  enableParams,
  openBindModal,
  children,
}: {
  enableParams: boolean;
  openBindModal: ((req: BindRequest) => void) | null;
  children: ReactNode;
}) {
  return (
    <Ctx.Provider value={{ enableParams, openBindModal }}>
      {children}
    </Ctx.Provider>
  );
}

export const useEditorConfig = () => useContext(Ctx);
