import { notFound } from "next/navigation";
import Link from "next/link";

import { api } from "@/trpc/server";
import { getSession } from "@/server/better-auth/server";

import { TemplateDetailClient } from "./TemplateDetailClient";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  try {
    const tpl = await api.marketplace.get({ slug });
    return {
      title: `${tpl.name} — Waku`,
      description: `Open ${tpl.archetype} template. ${Object.keys(tpl.params).length} params.`,
    };
  } catch {
    return { title: "Template not found — Waku" };
  }
}

export default async function TemplateDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  let tpl;
  try {
    tpl = await api.marketplace.get({ slug });
  } catch {
    notFound();
  }
  const session = await getSession();

  return (
    <div className="min-h-screen bg-[#030712] text-[#e5e7eb]">
      <header className="border-b border-[#1f2937] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="text-lg font-semibold">
            Waku
          </Link>
          <div className="flex items-center gap-3 text-sm text-[#9ca3af]">
            <Link href="/templates" className="hover:text-white">
              ← Gallery
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <TemplateDetailClient
          slug={tpl.slug}
          name={tpl.name}
          ir={tpl.ir}
          params={tpl.params}
          archetype={tpl.archetype}
          tags={tpl.tags}
          isAuthed={!!session?.user}
        />
      </main>
    </div>
  );
}
