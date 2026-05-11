import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { stockTemplate } from "@waku/db";

import { db } from "@/server/db";
import { env } from "@/env";

import AdminEditorShell from "./AdminEditorShell";

export default async function AdminEditStockTemplatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const row = await db.query.stockTemplate.findFirst({
    where: eq(stockTemplate.slug, slug),
  });
  if (!row) notFound();

  // Live preview hits the stock render endpoint so the editor canvas can
  // overlay live URL previews just like the user-facing editor.
  const liveUrl = `${env.NEXT_PUBLIC_RENDER_BASE_URL}/r/stock/${row.slug}`;

  return (
    <AdminEditorShell
      id={row.id}
      slug={row.slug}
      name={row.name}
      document={row.documentJson}
      published={row.publishedAt !== null}
      liveUrl={liveUrl}
    />
  );
}
