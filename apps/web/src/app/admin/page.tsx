import Link from "next/link";
import { count } from "drizzle-orm";
import { stockTemplate, templateCategory, user } from "@waku/db";

import { db } from "@/server/db";

export default async function AdminHomePage() {
  const [tplCount, catCount, userCount] = await Promise.all([
    db.select({ n: count() }).from(stockTemplate),
    db.select({ n: count() }).from(templateCategory),
    db.select({ n: count() }).from(user),
  ]);

  const stats = [
    {
      label: "Stock templates",
      value: tplCount[0]?.n ?? 0,
      href: "/admin/templates",
    },
    {
      label: "Categories",
      value: catCount[0]?.n ?? 0,
      href: "/admin/templates",
    },
    { label: "Users", value: userCount[0]?.n ?? 0, href: null },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-[#9ca3af]">
          Manage stock templates and categories surfaced in the user catalogue.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => {
          const card = (
            <div className="rounded-xl border border-[#1f2937] bg-[#0b0f1a] p-5 transition hover:border-[#374151]">
              <div className="text-xs tracking-wide text-[#9ca3af] uppercase">
                {s.label}
              </div>
              <div className="mt-2 text-3xl font-semibold">{s.value}</div>
            </div>
          );
          return s.href ? (
            <Link key={s.label} href={s.href}>
              {card}
            </Link>
          ) : (
            <div key={s.label}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
