import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/server/better-auth/server";
import { ensureProfile } from "@/server/profile";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/");
  const { handle } = await ensureProfile(session.user);

  return (
    <div className="min-h-screen bg-[#030712] text-[#e5e7eb]">
      <header className="border-b border-[#1f2937] px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/dashboard" className="text-lg font-semibold">
            Waku
          </Link>
          <div className="flex items-center gap-4 text-sm text-[#9ca3af]">
            <span className="font-mono">@{handle}</span>
            <Link
              href="/dashboard/templates/new"
              className="rounded-full bg-[#1f2937] px-4 py-1.5 font-medium text-[#e5e7eb] transition hover:bg-[#374151]"
            >
              New template
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
