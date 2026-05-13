import Link from "next/link";

import { DesignsList } from "./DesignsList";

export default function DesignsPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Your designs</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Every template you&apos;ve forked or created, newest first.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm text-[#9ca3af] hover:text-[#e5e7eb]"
        >
          ← Back to dashboard
        </Link>
      </div>
      <DesignsList />
    </div>
  );
}
