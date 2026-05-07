import { notFound } from "next/navigation";

import type { Node, ParamsSchema } from "@waku/ir";

import { getSession } from "@/server/better-auth/server";
import { ensureProfile } from "@/server/profile";
import { api } from "@/trpc/server";

import EditorPreview from "./EditorPreview";

const defaultForEntry = (entry: ParamsSchema[string]): unknown => {
  if (entry.default !== undefined) return entry.default;
  switch (entry.kind) {
    case "string":
    case "url":
      return "";
    case "color":
      return "#888888";
    case "number":
      return 0;
    case "boolean":
      return false;
    case "enum":
      return entry.values[0];
  }
};

const buildMockValues = (schema: ParamsSchema): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [k, entry] of Object.entries(schema)) {
    out[k] = defaultForEntry(entry);
  }
  return out;
};

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

  const mock = buildMockValues(version.paramsSchemaJson);

  return (
    <EditorPreview
      ir={version.irJson as Node}
      paramsSchema={version.paramsSchemaJson as ParamsSchema}
      templateName={tpl.name}
      templateSlug={tpl.slug}
      handle={handle}
      slug={tpl.slug}
      version={version.version}
      templateId={tpl.id}
      versionId={version.id}
      isPublished={version.publishedAt !== null}
      draftValues={mock}
    />
  );
}
