import { notFound } from "next/navigation";
import { getTemplate } from "@/templates";
import PlaygroundClient from "./PlaygroundClient";

const SYSTEM_HANDLE = "waku";

export default async function TemplatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tpl = getTemplate(slug, 1);
  if (!tpl) notFound();

  const defaults: Record<string, unknown> = {};
  for (const [k, entry] of Object.entries(tpl.params)) {
    if ("default" in entry && entry.default !== undefined) defaults[k] = entry.default;
    else defaults[k] = "";
  }

  return (
    <PlaygroundClient
      handle={SYSTEM_HANDLE}
      slug={tpl.slug}
      version={tpl.version}
      params={tpl.params}
      defaults={defaults}
    />
  );
}
