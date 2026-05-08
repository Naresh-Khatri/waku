"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { env } from "@/env";
import { api, type RouterOutputs } from "@/trpc/react";

type Template = RouterOutputs["template"]["get"];

type Props = {
  handle: string;
  template: Template;
};

const RENDER_BASE = env.NEXT_PUBLIC_RENDER_BASE_URL;

export default function TemplateClient({ handle, template }: Props) {
  const router = useRouter();
  const head = template.versions.find((v) => v.version === 1);

  const del = api.template.delete.useMutation({
    onSuccess: () => router.push("/dashboard"),
  });

  const liveUrl = head
    ? `${RENDER_BASE}/r/${handle}/${template.slug}/${head.version}`
    : null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-[#9ca3af] hover:text-[#e5e7eb]"
          >
            ← all templates
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{template.name}</h1>
          <p className="font-mono text-xs text-[#9ca3af]">{template.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/templates/${template.slug}/edit`}
            className="rounded-md border border-[#374151] px-3 py-1.5 text-sm text-[#e5e7eb] transition hover:bg-[#1f2937]"
          >
            Edit
          </Link>
          <button
            onClick={() => {
              if (
                confirm(
                  `Delete "${template.name}"? This cannot be undone.`,
                )
              ) {
                del.mutate({ templateId: template.id });
              }
            }}
            disabled={del.isPending}
            className="rounded-md border border-[#7f1d1d] px-3 py-1.5 text-sm text-[#fca5a5] transition hover:bg-[#1f0a0a] disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </header>

      {liveUrl && (
        <section className="rounded-xl border border-[#1f2937] bg-[#0b0f1a] p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-[#6ee7b7]">
            Render URL
          </div>
          <CopyField text={liveUrl} />
          <p className="mt-2 text-xs text-[#6b7280]">
            Edits autosave and update this URL. Append params as query strings —
            e.g. <code className="font-mono">?title=Hello</code>.
          </p>
        </section>
      )}
    </div>
  );
}

function CopyField({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex items-center gap-2">
      <code className="flex-1 overflow-x-auto rounded-md border border-[#1f2937] bg-[#030712] px-3 py-2 font-mono text-xs text-[#e5e7eb]">
        {text}
      </code>
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        className="shrink-0 rounded-md border border-[#374151] px-3 py-2 text-xs transition hover:bg-[#1f2937]"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
