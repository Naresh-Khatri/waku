"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

import { api } from "@/trpc/react";

type Props = {
  slug: string;
  name: string;
  archetype: string;
  tags: string[];
  isAuthed: boolean;
};

export function TemplateDetailClient({
  slug,
  name,
  archetype,
  tags,
  isAuthed,
}: Props) {
  const router = useRouter();
  const fork = api.marketplace.fork.useMutation({
    onSuccess: ({ template }) => {
      router.push(`/dashboard/templates/${template.slug}/edit`);
    },
  });
  const [error, setError] = useState<string | null>(null);

  const onFork = async () => {
    setError(null);
    if (!isAuthed) {
      router.push("/");
      return;
    }
    try {
      await fork.mutateAsync({ slug });
    } catch (e) {
      setError(e instanceof Error ? e.message : "fork failed");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-4">
        <div
          className="flex items-center justify-center rounded-xl border border-[#1f2937] bg-[#0a0e17] text-xs text-[#4b5563]"
          style={{ aspectRatio: "1200 / 630" }}
        >
          preview unavailable
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{name}</h1>
            <span className="rounded-full border border-[#1f2937] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#9ca3af]">
              {archetype}
            </span>
          </div>
          <div className="mt-1 text-xs text-[#9ca3af]">
            {tags.join(" · ")}
          </div>
        </div>
      </div>

      <aside className="flex flex-col gap-4">
        <div className="rounded-xl border border-[#1f2937] bg-[#0b0f1a] p-4">
          <button
            type="button"
            onClick={onFork}
            disabled={fork.isPending}
            className="w-full rounded-md bg-[#7c5cff] px-4 py-2 text-sm font-medium text-white hover:bg-[#6b4be0] disabled:opacity-50"
          >
            {fork.isPending
              ? "Forking…"
              : isAuthed
                ? "Fork to my account"
                : "Sign in to fork"}
          </button>
          {error && (
            <div className="mt-2 text-xs text-[#fca5a5]">{error}</div>
          )}
          {!isAuthed && (
            <div className="mt-2 text-center text-xs text-[#9ca3af]">
              <Link href="/" className="underline">
                sign in
              </Link>{" "}
              to fork into your dashboard
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
