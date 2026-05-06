import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/server/better-auth/server";
import { api } from "@/trpc/server";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect("/");

  const [templates, usage] = await Promise.all([
    api.template.list(),
    api.template.usage(),
  ]);

  if (templates.length === 0) {
    return (
      <div className="rounded-xl border border-[#1f2937] bg-[#0b0f1a] p-12 text-center">
        <h1 className="text-2xl font-semibold">No templates yet</h1>
        <p className="mt-2 text-[#9ca3af]">
          Create your first template to start rendering images via URL.
        </p>
        <Link
          href="/dashboard/templates/new"
          className="mt-6 inline-block rounded-full bg-[#7c5cff] px-6 py-2 font-medium text-white transition hover:bg-[#6b4be0]"
        >
          New template
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <UsageCard usage={usage} />
      <div>
        <h1 className="text-2xl font-semibold">Your templates</h1>
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {templates.map((t) => (
          <li
            key={t.id}
            className="rounded-xl border border-[#1f2937] bg-[#0b0f1a] p-5"
          >
            <Link
              href={`/dashboard/templates/${t.slug}`}
              className="block hover:opacity-90"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#9ca3af]">
                  {t.slug}
                </span>
                {t.publishedVersionId ? (
                  <span className="rounded-full bg-[#064e3b] px-2 py-0.5 text-xs text-[#6ee7b7]">
                    published
                  </span>
                ) : (
                  <span className="rounded-full bg-[#1f2937] px-2 py-0.5 text-xs text-[#9ca3af]">
                    draft
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-lg font-medium">{t.name}</h2>
              <p className="mt-1 text-xs text-[#9ca3af]">
                v{t.latestVersion} · updated {timeAgo(t.updatedAt)}
              </p>
            </Link>
          </li>
        ))}
        </ul>
      </div>
    </div>
  );
}

type Usage = Awaited<ReturnType<typeof api.template.usage>>;

function UsageCard({ usage }: { usage: Usage }) {
  const month = new Date(usage.monthStart).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });
  return (
    <section className="rounded-xl border border-[#1f2937] bg-[#0b0f1a] p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[#9ca3af]">
          Usage · {month}
        </h2>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-4">
        <Stat label="Renders" value={usage.renders.toLocaleString()} />
        <Stat
          label="p95 latency"
          value={usage.p95Ms === null ? "—" : `${usage.p95Ms}ms`}
        />
        <Stat label="Errors" value={usage.errors.toLocaleString()} />
      </div>
      {usage.top.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5">
          {usage.top.map((t) => (
            <li
              key={t.templateId}
              className="flex items-center justify-between text-sm"
            >
              <span className="font-mono text-xs text-[#9ca3af]">{t.slug}</span>
              <span className="text-[#e5e7eb]">
                {t.renders.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-[#6b7280]">{label}</div>
      <div className="mt-0.5 text-2xl font-semibold">{value}</div>
    </div>
  );
}

const timeAgo = (d: Date | string): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
};
