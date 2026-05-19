"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ChevronDown, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { TemplateDocument } from "@/components/template-editor/types";
import { authClient } from "@/server/better-auth/client";
import { api } from "@/trpc/react";

import { TemplatePreview } from "./template-preview";

const SUGGESTIONS: { label: string; prompt: string }[] = [
  {
    label: "Launching a developer tool",
    prompt:
      "We're launching a CLI that cuts AWS bills by 60% in a weekend. Need an OG image that feels confident and technical — dark, modern, headline-led.",
  },
  {
    label: "Long-form essay opener",
    prompt:
      'Cover image for an essay titled "The Last Honest Restaurant Critic". Editorial vibe — warm paper feel, serif headline, calm and quiet.',
  },
  {
    label: "Zine-style meme poster",
    prompt:
      'Meme poster that just shouts "TOUCH GRASS". Loud, brutalist, sticker energy. High contrast, no gradients.',
  },
  {
    label: "Podcast episode cover",
    prompt:
      'Podcast cover for episode 42 — "Why your startup\'s second hire matters more than the first". Show the episode number prominently and the host name.',
  },
];

type ProposeDesignPart = {
  type: string;
  toolCallId: string;
  state:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  input?: { name?: string; basedOnStock?: string } | undefined;
  output?:
    | { name: string; basedOnStock?: string; document: TemplateDocument }
    | undefined;
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

export function ChatComposer() {
  const utils = api.useUtils();
  const [expanded, setExpanded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(false);
  const [input, setInput] = useState("");
  const conversationIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

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

  useEffect(() => {
    const initial = readInitialChatId();
    if (!initial) return;
    setExpanded(true);
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

  const { data: session } = authClient.useSession();

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || status === "submitted" || status === "streaming") return;
    setExpanded(true);
    setInput("");
    void (async () => {
      // First persisting action for a guest → mint the anon session before
      // the POST so /api/chat sees a user (and conversation/credits scope).
      if (!session) {
        const res = await authClient.signIn.anonymous();
        if (res.error) return;
      }
      sendMessage({ text: trimmed });
    })();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const collapse = () => {
    setExpanded(false);
    inputRef.current?.blur();
    // Drop the ?chat= deep-link once the panel is closed — sharing the
    // dashboard URL shouldn't carry a stale chat reference.
    syncUrl(null);
  };

  const busy = status === "submitted" || status === "streaming";
  const empty = messages.length === 0 && !hydrating;
  const lastMessage = messages[messages.length - 1];
  const showTyping =
    status === "submitted" ||
    (status === "streaming" && lastMessage?.role === "user");

  return (
    <>
      <AnimatePresence>
        {expanded ? (
          <motion.button
            key="backdrop"
            type="button"
            aria-label="Collapse chat"
            onClick={collapse}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-30 cursor-default bg-black/60 backdrop-blur-sm"
          />
        ) : null}
      </AnimatePresence>

      <motion.div
        layout
        transition={PANEL_SPRING}
        className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-3xl flex-col px-4 pb-6"
      >
        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              key="panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 560, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={PANEL_SPRING}
              style={{ maxHeight: "calc(100vh - 96px)" }}
              className="flex min-h-0 flex-col overflow-hidden rounded-t-2xl border border-b-0 border-[#1f2937] bg-[#0b0f1a]"
            >
              <ChatHeader
                activeId={activeId}
                onNewChat={newChat}
                onSelectChat={selectChat}
                onCollapse={collapse}
              />
              <div className="flex-1 overflow-y-auto">
                {hydrating ? (
                  <div className="flex h-full items-center justify-center text-sm text-[#6b7280]">
                    Loading chat…
                  </div>
                ) : empty ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12, duration: 0.22 }}
                    className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center"
                  >
                    <div>
                      <h2 className="text-2xl font-semibold text-[#e5e7eb]">
                        What should we design today?
                      </h2>
                      <p className="mt-2 text-sm text-[#9ca3af]">
                        Describe the OG image you want — I&apos;ll sketch
                        starting points you can edit.
                      </p>
                    </div>
                    <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          onClick={() => send(s.prompt)}
                          disabled={busy}
                          className="rounded-lg border border-[#1f2937] bg-[#0b0f1a] px-3 py-2.5 text-left text-sm text-[#9ca3af] transition hover:border-[#7c5cff] hover:text-[#e5e7eb] disabled:opacity-50"
                          title={s.prompt}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col gap-5 px-4 py-6">
                    {messages.map((m) => (
                      <MessageThread
                        key={m.id}
                        message={m}
                        conversationId={activeId}
                      />
                    ))}
                    {showTyping ? <Typing /> : null}
                    {error ? (
                      <div className="rounded-md border border-[#7f1d1d] bg-[#1f0a0a] px-3 py-2 text-sm text-[#fca5a5]">
                        Something went wrong. Please try again.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.form
          layout
          transition={PANEL_SPRING}
          onSubmit={onSubmit}
          className={`flex items-end gap-2 border border-[#1f2937] bg-[#0b0f1a]/95 p-2 shadow-lg backdrop-blur focus-within:border-[#7c5cff] ${
            expanded ? "rounded-b-2xl border-t-0" : "rounded-2xl"
          }`}
        >
          {!expanded ? (
            <Sparkles className="ml-2 mt-2 h-4 w-4 shrink-0 text-[#7c5cff]" />
          ) : null}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setExpanded(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              } else if (e.key === "Escape" && expanded) {
                e.preventDefault();
                collapse();
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
        </motion.form>
      </motion.div>
    </>
  );
}

const PANEL_SPRING = {
  type: "spring" as const,
  stiffness: 320,
  damping: 32,
  mass: 0.6,
};

function ChatHeader({
  activeId,
  onNewChat,
  onSelectChat,
  onCollapse,
}: {
  activeId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onCollapse: () => void;
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
    <div className="flex items-center justify-between gap-2 border-b border-[#1f2937] px-3 py-2">
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
                      <X className="h-3 w-3" />
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
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse"
          className="rounded-md border border-[#1f2937] p-1 text-[#9ca3af] transition hover:border-[#7c5cff] hover:text-[#e5e7eb]"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function MessageThread({
  message,
  conversationId,
}: {
  message: UIMessage;
  conversationId: string | null;
}) {
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
              conversationId={conversationId}
              messageId={message.id}
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

// Clicking the rendered design forks the AI's proposal into a user-owned
// template and drops the user into the editor — no explicit "fork" affordance,
// since the click itself is the edit intent. The server re-reads the design
// from the persisted chat message so the client can't smuggle in arbitrary json.
function DesignProposal({
  part,
  conversationId,
  messageId,
}: {
  part: ProposeDesignPart;
  conversationId: string | null;
  messageId: string;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const [forking, setForking] = useState(false);
  const [forkError, setForkError] = useState<string | null>(null);

  const fork = api.template.forkFromAi.useMutation({
    onSuccess: async ({ template }) => {
      await utils.template.list.invalidate();
      await utils.template.listMine.invalidate();
      router.push(`/templates/${template.slug}`);
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
  const { name, document, basedOnStock } = part.output;
  // Persistence happens on stream finish — before that we can't fork from db.
  const persisted = Boolean(conversationId);

  const onOpen = () => {
    if (forking || !conversationId) return;
    setForkError(null);
    setForking(true);
    fork.mutate({
      conversationId,
      messageId,
      toolCallId: part.toolCallId,
    });
  };

  return (
    <ProposalShell label={name} sublabel={basedOnStock ? `based on ${basedOnStock}` : null}>
      <button
        type="button"
        onClick={onOpen}
        disabled={forking || !persisted}
        className="group block w-full overflow-hidden rounded-md border border-[#1f2937] text-left transition hover:border-[#7c5cff] focus:outline-none focus-visible:border-[#7c5cff] disabled:opacity-60"
        aria-label={`Open "${name}" in editor`}
      >
        <TemplatePreview document={document} />
        <div className="border-t border-[#1f2937] bg-[#0b0f1a] px-3 py-1.5 text-[11px] text-[#9ca3af] group-hover:text-[#e5e7eb]">
          {forking
            ? "Opening editor…"
            : !persisted
              ? "Saving chat…"
              : "Click to open in editor →"}
        </div>
      </button>
      {forkError ? (
        <div className="rounded-md border border-[#7f1d1d] bg-[#1f0a0a] px-3 py-2 text-xs text-[#fca5a5]">
          {forkError}
        </div>
      ) : null}
    </ProposalShell>
  );
}

function ProposalShell({
  label,
  sublabel,
  children,
}: {
  label: string;
  sublabel?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="w-sm flex justify-start">
      <div className="flex w-full flex-col gap-2 rounded-2xl rounded-bl-sm border border-[#1f2937] bg-[#0b0f1a] p-3">
        <div className="flex items-baseline justify-between gap-2 px-1">
          <div className="text-xs font-medium text-[#9ca3af]">{label}</div>
          {sublabel ? (
            <div className="truncate text-[10px] text-[#6b7280]">{sublabel}</div>
          ) : null}
        </div>
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
