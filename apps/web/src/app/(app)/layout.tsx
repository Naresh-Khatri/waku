import Link from "next/link";

import { AuthButton } from "@/components/auth-button";
import { getSession } from "@/server/better-auth/server";
import { getLastUsedProvider } from "@/server/better-auth/last-used";
import { ensureProfile } from "@/server/profile";
import { api } from "@/trpc/server";

import { DashboardShell } from "./_components/dashboard-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const lastUsed = await getLastUsedProvider();

  // A guest has a session but no real account. They still get a profile
  // (the handle is needed for render-preview URLs in the editor), but the
  // member chrome (@handle, credits) is reserved for real accounts.
  const isRealUser = !!session?.user && !session.user.isAnonymous;
  const profile =
    session?.user && isRealUser ? await ensureProfile(session.user) : null;

  const [templates, usage] = session?.user
    ? await Promise.all([api.template.list(), api.template.usage()])
    : [[], { renders: 0, errors: 0, p95Ms: null as number | null }];

  return (
    <div className="min-h-screen bg-[#030712] text-[#e5e7eb]">
      <header className="border-b border-[#1f2937] px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold">
            Waku
          </Link>
          <div className="flex items-center gap-4 text-sm text-[#9ca3af]">
            {profile ? (
              <>
                <span className="font-mono">@{profile.handle}</span>
                <Link
                  href="/credits"
                  className="rounded-full border border-[#1f2937] px-3 py-1 text-xs hover:border-[#7c5cff]"
                >
                  credits
                </Link>
              </>
            ) : null}
            <AuthButton
              loggedIn={isRealUser}
              user={isRealUser ? (session?.user ?? null) : null}
              lastUsed={lastUsed}
            />
          </div>
        </div>
      </header>
      <DashboardShell
        initialTemplates={templates}
        initialUsage={{
          renders: usage.renders,
          errors: usage.errors,
          p95Ms: usage.p95Ms,
        }}
      >
        {children}
      </DashboardShell>
    </div>
  );
}
