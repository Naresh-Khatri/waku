import { api } from "@/trpc/server";

export default async function CreditsPage() {
  const [balance, history] = await Promise.all([
    api.credits.balance(),
    api.credits.history({ limit: 50 }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Credits</h1>
        <p className="mt-1 text-sm text-[#9ca3af]">
          AI assists, theme remixes, and copy generation are credit-metered.
          Stripe top-ups are coming soon.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Balance" value={`${balance.balance}`} />
        <Stat label="Pick template" value={`${balance.costs.pickTemplate} cr`} />
        <Stat label="Theme remix" value={`${balance.costs.remixTheme} cr`} />
        <Stat label="AI copy" value={`${balance.costs.generateCopy} cr`} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-[#9ca3af]">History</h2>
        {history.length === 0 ? (
          <div className="rounded-xl border border-[#1f2937] bg-[#0b0f1a] p-6 text-sm text-[#9ca3af]">
            No transactions yet.
          </div>
        ) : (
          <ul className="rounded-xl border border-[#1f2937] bg-[#0b0f1a] divide-y divide-[#1f2937]">
            {history.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                <span className="text-[#9ca3af]">
                  {new Date(row.createdAt).toLocaleString()}
                </span>
                <span className="font-mono">{row.reason}</span>
                <span
                  className={
                    row.delta < 0 ? "text-[#fca5a5]" : "text-[#86efac]"
                  }
                >
                  {row.delta > 0 ? "+" : ""}
                  {row.delta}
                </span>
                <span className="text-[#6b7280]">→ {row.balanceAfter}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#1f2937] bg-[#0b0f1a] p-4">
      <div className="text-xs uppercase tracking-wide text-[#9ca3af]">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
