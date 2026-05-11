"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { TemplateDocument } from "@/components/template-editor/types";
import { api } from "@/trpc/react";

import { TemplatePreview } from "./template-preview";

const SUGGESTIONS = [
  "An OG image for a blog post about Postgres performance",
  "A product launch card with a bold headline and gradient",
  "A quote card on a warm pastel background",
  "A minimal opener for my podcast episode",
];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56) || "design";

type ProposeDesignPart = {
  type: string;
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  input?: { name?: string } | undefined;
  output?: { name: string; document: TemplateDocument } | undefined;
  errorText?: string | undefined;
};

function readInitialChatId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("chat");
}

function syncUrl(chatId: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (chatId) url.searchParams.set("chat", chatId);
  else url.searchParams.delete("chat");
  window.history.replaceState(null, "", url.pathname + url.search);
}

export function AiChat() {
  const utils = api.useUtils();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(false);
  const [input, setInput] = useState("");
  const conversationIdRef = useRef<string | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, id }) => ({
          body: {
            id,
            messages,
            conversationId: conversationIdRef.current,
          },
        }),
        fetch: async (input, init) => {
          const res = await fetch(input, init);
          const cid = res.headers.get("x-conversation-id");
          if (cid) conversationIdRef.current = cid;
          return res;
        },
      }),
    [],
  );

  const { messages, sendMessage, status, error, stop, setMessages } = useChat({
    transport,
    onFinish: () => {
      const cid = conversationIdRef.current;
      if (cid && cid !== activeId) {
        setActiveId(cid);
        syncUrl(cid);
      }
      void utils.chat.list.invalidate();
    },
  });

  // Hydrate from URL on first mount.
  useEffect(() => {
    const initial = readInitialChatId();
    if (!initial) return;
    void selectChat(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectChat = async (id: string) => {
    if (id === activeId) return;
    stop();
    setHydrating(true);
    setActiveId(id);
    conversationIdRef.current = id;
    syncUrl(id);
    try {
      const data = await utils.chat.get.fetch({ id });
      setMessages(
        data.messages.map((m) => ({
          id: m.id,
          role: m.role as UIMessage["role"],
          parts: m.parts as UIMessage["parts"],
        })) as UIMessage[],
      );
    } catch {
      // chat not found or unauthorized — fall back to new chat
      conversationIdRef.current = null;
      setActiveId(null);
      setMessages([]);
      syncUrl(null);
    } finally {
      setHydrating(false);
    }
  };

  const newChat = () => {
    stop();
    conversationIdRef.current = null;
    setActiveId(null);
    setMessages([]);
    setInput("");
    syncUrl(null);
  };

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || status === "submitted" || status === "streaming") return;
    sendMessage({ text: trimmed });
    setInput("");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const empty = messages.length === 0 && !hydrating;
  const busy = status === "submitted" || status === "streaming";
  const lastMessage = messages[messages.length - 1];
  const showTyping =
    status === "submitted" ||
    (status === "streaming" && lastMessage?.role === "user");

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col">
      <ChatHeader
        activeId={activeId}
        onNewChat={newChat}
        onSelectChat={selectChat}
      />
      <div className="flex-1 overflow-y-auto">
        {hydrating ? (
          <div className="flex h-full items-center justify-center text-sm text-[#6b7280]">
            Loading chat…
          </div>
        ) : empty ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
            <div>
              <h2 className="text-3xl font-semibold text-[#e5e7eb]">
                What should we design today?
              </h2>
              <p className="mt-2 text-sm text-[#9ca3af]">
                Describe the OG image you want — I&apos;ll sketch a few starting
                points you can fork.
              </p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  disabled={busy}
                  className="rounded-lg border border-[#1f2937] bg-[#0b0f1a] px-3 py-2.5 text-left text-sm text-[#9ca3af] transition hover:border-[#7c5cff] hover:text-[#e5e7eb] disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
            {messages.map((m) => (
              <MessageThread key={m.id} message={m} />
            ))}
            {showTyping ? <Typing /> : null}
            {error ? (
              <div className="rounded-md border border-[#7f1d1d] bg-[#1f0a0a] px-3 py-2 text-sm text-[#fca5a5]">
                {error.message || "Something went wrong"}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <form
        onSubmit={onSubmit}
        className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-[#1f2937] bg-[#0b0f1a] p-2 focus-within:border-[#7c5cff]">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Describe an OG image…"
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[#e5e7eb] placeholder:text-[#6b7280] focus:outline-none"
          />
          {busy ? (
            <button
              type="button"
              onClick={stop}
              className="rounded-full border border-[#1f2937] px-4 py-2 text-sm font-medium text-[#9ca3af] transition hover:border-[#7c5cff] hover:text-[#e5e7eb]"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="rounded-full bg-[#7c5cff] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#6b4be0] disabled:opacity-40"
            >
              Send
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function ChatHeader({
  activeId,
  onNewChat,
  onSelectChat,
}: {
  activeId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const list = api.chat.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const utils = api.useUtils();
  const del = api.chat.delete.useMutation({
    onSuccess: async () => {
      await utils.chat.list.invalidate();
    },
  });

  const current = list.data?.find((c) => c.id === activeId);

  return (
    <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-4 pb-2 pt-1">
      <div className="truncate text-sm text-[#9ca3af]">
        {current?.title ?? (activeId ? "Chat" : "New chat")}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onNewChat}
          className="rounded-md border border-[#1f2937] px-2.5 py-1 text-xs text-[#9ca3af] transition hover:border-[#7c5cff] hover:text-[#e5e7eb]"
        >
          + New
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded-md border border-[#1f2937] px-2.5 py-1 text-xs text-[#9ca3af] transition hover:border-[#7c5cff] hover:text-[#e5e7eb]"
          >
            History ▾
          </button>
          {open ? (
            <div
              className="absolute right-0 top-8 z-20 max-h-80 w-72 overflow-y-auto rounded-md border border-[#1f2937] bg-[#0b0f1a] py-1 shadow-lg"
              onMouseLeave={() => setOpen(false)}
            >
              {list.isLoading ? (
                <div className="px-3 py-2 text-xs text-[#6b7280]">Loading…</div>
              ) : list.data && list.data.length > 0 ? (
                list.data.map((c) => (
                  <div
                    key={c.id}
                    className={`group flex items-center gap-1 px-2 py-1 text-xs ${
                      c.id === activeId ? "bg-[#111827]" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onSelectChat(c.id);
                      }}
                      className="flex-1 truncate rounded px-2 py-1 text-left text-[#e5e7eb] hover:bg-[#1f2937]"
                    >
                      {c.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (del.isPending) return;
                        del.mutate({ id: c.id });
                      }}
                      className="rounded px-1.5 py-1 text-[#6b7280] opacity-0 transition hover:text-[#fca5a5] group-hover:opacity-100"
                      aria-label="Delete chat"
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-[#6b7280]">
                  No chats yet
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MessageThread({ message }: { message: UIMessage }) {
  return (
    <div className="flex flex-col gap-3">
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          if (!part.text) return null;
          return <MessageBubble key={i} role={message.role} text={part.text} />;
        }
        if (part.type === "tool-propose_design") {
          return (
            <DesignProposal
              key={i}
              part={part as unknown as ProposeDesignPart}
            />
          );
        }
        return null;
      })}
    </div>
  );
}

function MessageBubble({
  role,
  text,
}: {
  role: UIMessage["role"];
  text: string;
}) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-[#7c5cff] px-4 py-2.5 text-sm text-white">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-[#1f2937] bg-[#0b0f1a] px-4 py-2.5 text-sm text-[#e5e7eb]">
        {text}
      </div>
    </div>
  );
}

function DesignProposal({ part }: { part: ProposeDesignPart }) {
  const router = useRouter();
  const utils = api.useUtils();
  const [forking, setForking] = useState(false);
  const [forkError, setForkError] = useState<string | null>(null);

  const create = api.template.create.useMutation({
    onSuccess: async ({ template }) => {
      await utils.template.list.invalidate();
      router.push(`/dashboard/templates/${template.slug}`);
    },
    onError: (err) => {
      setForkError(err.message);
      setForking(false);
    },
  });

  if (part.state === "input-streaming" || part.state === "input-available") {
    const name = part.input?.name;
    return (
      <ProposalShell label={name ? `Designing "${name}"…` : "Designing…"}>
        <div className="aspect-[1200/630] w-full animate-pulse rounded-md bg-[#111827]" />
      </ProposalShell>
    );
  }

  if (part.state === "output-error") {
    return (
      <ProposalShell label="Design failed">
        <div className="rounded-md border border-[#7f1d1d] bg-[#1f0a0a] px-3 py-2 text-xs text-[#fca5a5]">
          {part.errorText ?? "Could not generate this design"}
        </div>
      </ProposalShell>
    );
  }

  if (part.state !== "output-available" || !part.output) return null;
  const { name, document } = part.output;

  const onFork = () => {
    if (forking) return;
    setForkError(null);
    setForking(true);
    const stamp = Date.now().toString(36).slice(-4);
    create.mutate({
      slug: `${slugify(name)}-${stamp}`,
      name,
      documentJson: document,
    });
  };

  return (
    <ProposalShell label={name}>
      <div className="overflow-hidden rounded-md border border-[#1f2937]">
        <TemplatePreview document={document} />
      </div>
      {forkError ? (
        <div className="rounded-md border border-[#7f1d1d] bg-[#1f0a0a] px-3 py-2 text-xs text-[#fca5a5]">
          {forkError}
        </div>
      ) : null}
      <button
        type="button"
        onClick={onFork}
        disabled={forking}
        className="self-start rounded-md bg-[#7c5cff] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#6b4be0] disabled:opacity-40"
      >
        {forking ? "Forking…" : "Fork & edit"}
      </button>
    </ProposalShell>
  );
}

function ProposalShell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-sm flex justify-start">
      <div className="flex w-full flex-col gap-2 rounded-2xl rounded-bl-sm border border-[#1f2937] bg-[#0b0f1a] p-3">
        <div className="px-1 text-xs font-medium text-[#9ca3af]">{label}</div>
        {children}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-sm border border-[#1f2937] bg-[#0b0f1a] px-4 py-3">
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6b7280]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6b7280] [animation-delay:120ms]" />
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6b7280] [animation-delay:240ms]" />
        </div>
      </div>
    </div>
  );
}
