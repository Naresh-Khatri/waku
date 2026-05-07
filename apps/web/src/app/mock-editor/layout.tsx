import type { ReactNode } from "react";

export default function MockEditorLayout({ children }: { children: ReactNode }) {
  return <div className="h-screen w-screen overflow-hidden bg-zinc-100">{children}</div>;
}
