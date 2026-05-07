import { notFound } from "next/navigation";

import type { TemplateDocument } from "@/components/template-editor/types";
import { getSession } from "@/server/better-auth/server";
import { ensureProfile } from "@/server/profile";
import { api } from "@/trpc/server";

import EditorPreview from "./EditorPreview";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await getSession();
  if (!session?.user) notFound();
  const { handle } = await ensureProfile(session.user);

  let tpl;
  try {
    tpl = await api.template.get({ slug });
  } catch {
    notFound();
  }
  const latest = tpl.versions[0];
  if (!latest) notFound();
  const version = await api.template.getVersion({ versionId: latest.id });

  return (
    <EditorPreview
      document={version.documentJson as TemplateDocument}
      templateName={tpl.name}
      templateSlug={tpl.slug}
      handle={handle}
      version={version.version}
      versionId={version.id}
      isPublished={version.publishedAt !== null}
    />
  );
}
