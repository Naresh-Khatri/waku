"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { api } from "@/trpc/react";

type Template = {
  id: string;
  slug: string;
  name: string;
  publishedVersionId: string | null;
  updatedAt: Date | string;
};

type Usage = {
  renders: number;
  errors: number;
  p95Ms: number | null;
};

export function DashboardShell({
  initialTemplates,
  initialUsage,
  children,
}: {
  initialTemplates: Template[];
  initialUsage: Usage;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isEditor =
    pathname?.startsWith("/dashboard/templates/") &&
    pathname !== "/dashboard/templates";
  // Index and /designs already surface My Designs + catalogue + chat composer,
  // so the sidebar would just duplicate them.
  const hideSidebar =
    isEditor ||
    pathname === "/dashboard" ||
    pathname === "/dashboard/designs";

  if (hideSidebar) {
    return (
      <main className={isEditor ? "px-0 py-0" : "px-8 py-8"}>{children}</main>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-65px)]">
      <Sidebar
        initialTemplates={initialTemplates}
        initialUsage={initialUsage}
      />
      <main className="flex-1 overflow-x-hidden px-8 py-8">{children}</main>
    </div>
  );
}

function Sidebar({
  initialTemplates,
  initialUsage,
}: {
  initialTemplates: Template[];
  initialUsage: Usage;
}) {
  const pathname = usePathname();
  const { data: templates } = api.template.list.useQuery(undefined, {
    initialData: initialTemplates as never,
    refetchOnMount: false,
  });
  const list = (templates ?? initialTemplates) as Template[];

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-[#1f2937] bg-[#070b14]">
      <div className="flex-1 overflow-y-auto px-2 pt-4">
        <div className="px-2 pb-2 text-[10px] font-medium uppercase tracking-wider text-[#6b7280]">
          Your designs
        </div>
        {list.length === 0 ? (
          <div className="px-2 py-3 text-xs text-[#6b7280]">
            No designs yet.
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {list.map((t) => {
              const href = `/dashboard/templates/${t.slug}`;
              const active = pathname?.startsWith(href);
              return (
                <li key={t.id}>
                  <Link
                    href={href}
                    className={`flex flex-col gap-0.5 rounded-md px-2 py-2 transition ${
                      active
                        ? "bg-[#1f2937]"
                        : "hover:bg-[#111827]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-[#e5e7eb]">
                        {t.name}
                      </span>
                      {t.publishedVersionId ? (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#6ee7b7]" />
                      ) : null}
                    </div>
                    <span className="truncate font-mono text-[10px] text-[#6b7280]">
                      {t.slug}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-[#1f2937] px-4 py-3">
        <div className="text-[10px] font-medium uppercase tracking-wider text-[#6b7280]">
          This month
        </div>
        <div className="mt-2 flex items-baseline justify-between text-sm">
          <span className="text-[#9ca3af]">Renders</span>
          <span className="font-medium text-[#e5e7eb]">
            {initialUsage.renders.toLocaleString()}
          </span>
        </div>
        <div className="mt-1 flex items-baseline justify-between text-sm">
          <span className="text-[#9ca3af]">p95</span>
          <span className="font-medium text-[#e5e7eb]">
            {initialUsage.p95Ms === null ? "—" : `${initialUsage.p95Ms}ms`}
          </span>
        </div>
        <div className="mt-1 flex items-baseline justify-between text-sm">
          <span className="text-[#9ca3af]">Errors</span>
          <span className="font-medium text-[#e5e7eb]">
            {initialUsage.errors.toLocaleString()}
          </span>
        </div>
      </div>
    </aside>
  );
}
