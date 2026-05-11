import Link from "next/link";

import { CategoriesPopover } from "./_categories-popover";
import { StockTemplatesTable } from "./_table";

export default function AdminTemplatesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Stock templates</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Curated starters shown in the user catalogue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CategoriesPopover />
          <Link
            href="/admin/templates/new"
            className="rounded-md bg-[#7c5cff] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#6b4be0]"
          >
            New template
          </Link>
        </div>
      </div>
      <StockTemplatesTable />
    </div>
  );
}
