import { notFound } from "next/navigation";
import Link from "next/link";

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
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <Link
            href={`/dashboard/templates/${tpl.slug}`}
            className="text-sm text-[#9ca3af] hover:text-[#e5e7eb]"
          >
            ← back to {tpl.name}
          </Link>
          <h1 className="mt-1 text-xl font-semibold">
            {tpl.name}{" "}
            <span className="font-mono text-xs text-[#6b7280]">
              v{version.version} draft preview
            </span>
          </h1>
        </div>
      </header>

      <EditorPreview
        ir={version.irJson as Node}
        paramsSchema={version.paramsSchemaJson as ParamsSchema}
        handle={handle}
        slug={tpl.slug}
        version={version.version}
        draftValues={mock}
      />
    </div>
  );
}
