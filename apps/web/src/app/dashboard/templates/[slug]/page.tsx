import { notFound } from "next/navigation";

import { getSession } from "@/server/better-auth/server";
import { ensureProfile } from "@/server/profile";
import { api } from "@/trpc/server";

import TemplateClient from "./TemplateClient";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  if (!session?.user) notFound();
  const { handle } = await ensureProfile(session.user);

  try {
    const tpl = await api.template.get({ slug });
    return <TemplateClient handle={handle} template={tpl} />;
  } catch {
    notFound();
  }
}
