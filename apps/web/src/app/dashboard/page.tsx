"use client";

import { useState } from "react";

import { AiChat } from "./_components/ai-chat";
import { Catalogue } from "./_components/catalogue";

type Tab = "chat" | "catalogue";

export default function DashboardPage() {
  const [tab, setTab] = useState<Tab>("chat");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center gap-1 border-b border-[#1f2937]">
        <TabButton active={tab === "chat"} onClick={() => setTab("chat")}>
          Create with AI
        </TabButton>
        <TabButton
          active={tab === "catalogue"}
          onClick={() => setTab("catalogue")}
        >
          Designs catalogue
        </TabButton>
      </div>

      {tab === "chat" ? <AiChat /> : <Catalogue />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-4 py-2.5 text-sm font-medium transition ${
        active
          ? "text-[#e5e7eb]"
          : "text-[#9ca3af] hover:text-[#e5e7eb]"
      }`}
    >
      {children}
      {active ? (
        <span className="absolute inset-x-2 -bottom-px h-0.5 bg-[#7c5cff]" />
      ) : null}
    </button>
  );
}
