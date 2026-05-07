import Link from "next/link";

import { api } from "@/trpc/server";

export const metadata = {
  title: "Template gallery — Waku",
  description: "Browse and fork open image templates.",
};

export default async function GalleryPage() {
  const listings = await api.marketplace.list();
  return (
    <div className="min-h-screen bg-[#030712] text-[#e5e7eb]">
      <header className="border-b border-[#1f2937] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="text-lg font-semibold">
            Waku
          </Link>
          <div className="flex items-center gap-3 text-sm text-[#9ca3af]">
            <Link href="/templates" className="text-white">
              Gallery
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full bg-[#7c5cff] px-4 py-1.5 font-medium text-white"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold">Template gallery</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Curated image templates. Click any to preview and fork into your
            account.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((t) => (
            <li
              key={t.slug}
              className="overflow-hidden rounded-xl border border-[#1f2937] bg-[#0b0f1a] transition hover:border-[#7c5cff]"
            >
              <Link href={`/templates/${t.slug}`} className="block">
                <div
                  className="flex items-center justify-center bg-[#0a0e17] text-xs text-[#4b5563]"
                  style={{ aspectRatio: "1200 / 630" }}
                >
                  preview unavailable
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t.name}</span>
                    <span className="rounded-full border border-[#1f2937] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#9ca3af]">
                      {t.archetype}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[#9ca3af]">
                    {t.paramCount} params · {t.tags.join(" · ")}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
