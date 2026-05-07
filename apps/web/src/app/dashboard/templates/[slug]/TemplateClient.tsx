"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { env } from "@/env";
import { api, type RouterOutputs } from "@/trpc/react";

type Template = RouterOutputs["template"]["get"];
type Version = Template["versions"][number];

type Props = {
  handle: string;
  template: Template;
};

const RENDER_BASE = env.NEXT_PUBLIC_RENDER_BASE_URL;

const renderUrl = (handle: string, slug: string, version: number | "published") =>
  `${RENDER_BASE}/r/${handle}/${slug}/${version}`;

export default function TemplateClient({ handle, template }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    template.versions[0]?.id ?? null,
  );
  const selected = template.versions.find((v) => v.id === selectedVersionId);

  const publish = api.template.publish.useMutation({
    onSuccess: () => {
      void utils.template.get.invalidate({ slug: template.slug });
      router.refresh();
    },
  });

  const del = api.template.delete.useMutation({
    onSuccess: () => router.push("/dashboard"),
  });

  const fork = api.template.createVersion.useMutation({
    onSuccess: () => {
      void utils.template.get.invalidate({ slug: template.slug });
      router.refresh();
    },
  });

  const draftUrl = selected
    ? renderUrl(handle, template.slug, selected.version)
    : "";
  const publishedUrl = template.publishedVersionId
    ? renderUrl(handle, template.slug, "published")
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
                  `Delete "${template.name}" and all its versions? This cannot be undone.`,
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

      {publishedUrl && (
        <section className="rounded-xl border border-[#1f2937] bg-[#0b0f1a] p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-[#6ee7b7]">
            Published URL
          </div>
          <CopyField text={publishedUrl} />
          <p className="mt-2 text-xs text-[#6b7280]">
            The <code className="font-mono">/published</code> path 302-redirects
            to the current version.
          </p>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Versions</h2>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[260px_1fr]">
          <ul className="flex flex-col gap-2">
            {template.versions.map((v) => (
              <VersionRow
                key={v.id}
                version={v}
                isSelected={v.id === selectedVersionId}
                isPublished={v.id === template.publishedVersionId}
                onClick={() => setSelectedVersionId(v.id)}
              />
            ))}
          </ul>
          <div className="rounded-xl border border-[#1f2937] bg-[#0b0f1a] p-5">
            {selected ? (
              <div className="flex flex-col gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-[#9ca3af]">
                    Render URL
                  </div>
                  <CopyField text={draftUrl} />
                </div>
                <div className="flex items-center gap-3">
                  {selected.publishedAt === null ? (
                    <button
                      onClick={() =>
                        publish.mutate({ versionId: selected.id })
                      }
                      disabled={publish.isPending}
                      className="rounded-full bg-[#7c5cff] px-4 py-1.5 text-sm font-medium text-white transition hover:bg-[#6b4be0] disabled:opacity-50"
                    >
                      {publish.isPending ? "Publishing..." : "Publish"}
                    </button>
                  ) : (
                    <span className="rounded-full bg-[#064e3b] px-3 py-1 text-xs text-[#6ee7b7]">
                      published {new Date(selected.publishedAt).toLocaleString()}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      const v = template.versions.find(
                        (x) => x.id === selected.id,
                      );
                      if (!v) return;
                      void utils.template.getVersion
                        .fetch({ versionId: v.id })
                        .then((source) => {
                          fork.mutate({
                            templateId: template.id,
                            irJson: source.irJson,
                            paramsSchemaJson: source.paramsSchemaJson,
                          });
                        });
                    }}
                    disabled={fork.isPending}
                    className="rounded-full border border-[#374151] px-4 py-1.5 text-sm text-[#e5e7eb] transition hover:bg-[#1f2937] disabled:opacity-50"
                  >
                    {fork.isPending ? "Forking..." : "Fork as new draft"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#9ca3af]">No version selected.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function VersionRow({
  version,
  isSelected,
  isPublished,
  onClick,
}: {
  version: Version;
  isSelected: boolean;
  isPublished: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
          isSelected
            ? "border-[#7c5cff] bg-[#1f1633]"
            : "border-[#1f2937] hover:bg-[#0f1626]"
        }`}
      >
        <span className="font-mono">v{version.version}</span>
        <span className="flex items-center gap-2 text-xs">
          {isPublished && (
            <span className="rounded-full bg-[#064e3b] px-2 py-0.5 text-[#6ee7b7]">
              live
            </span>
          )}
          {version.publishedAt === null ? (
            <span className="text-[#9ca3af]">draft</span>
          ) : (
            <span className="text-[#9ca3af]">published</span>
          )}
        </span>
      </button>
    </li>
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
