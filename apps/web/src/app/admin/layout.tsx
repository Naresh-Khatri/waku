import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getSession } from "@/server/better-auth/server";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/templates", label: "Stock templates" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/");
  if (!session.user.isAdmin) notFound();

  return (
    <div className="min-h-screen bg-[#030712] text-[#e5e7eb]">
      <header className="border-b border-[#1f2937] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-lg font-semibold">
              Waku
            </Link>
            <span className="rounded-full border border-[#7c5cff] px-2 py-0.5 text-[10px] tracking-wider text-[#a78bfa] uppercase">
              admin
            </span>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-[#9ca3af] hover:text-[#e5e7eb]"
          >
            ← back to dashboard
          </Link>
        </div>
      </header>

      <div className="flex">
        <aside className="min-h-[calc(100vh-65px)] w-56 border-r border-[#1f2937] px-3 py-6">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm text-[#d1d5db] transition hover:bg-[#111827]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
