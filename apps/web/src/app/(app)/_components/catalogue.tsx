"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";

import { TemplateCard } from "@/components/templates/template-card";
import { TemplateCardSkeleton } from "@/components/templates/template-card-skeleton";
import type { TemplateDocument } from "@/components/template-editor/types";
import type { AuthProvider } from "@/server/better-auth/last-used";
import { api } from "@/trpc/react";

import { TemplateForkDialog } from "./template-fork-dialog";

const CATEGORY_SKELETON_COUNT = 8;
const SKELETON_GROUPS = 2;

type StockItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tags: string[];
  thumbnailUrl: string | null;
  documentJson: TemplateDocument | null;
  category: { id: string; slug: string; name: string } | null;
};

export function Catalogue({
  loggedIn,
  lastUsed,
}: {
  loggedIn: boolean;
  lastUsed: AuthProvider | null;
}) {
  const router = useRouter();
  const stockQuery = api.template.listStock.useQuery();
  const forkMutation = api.template.forkFromStock.useMutation();
  const [selected, setSelected] = useState<StockItem | null>(null);

  // After a guest signs in from the fork dialog, OAuth round-trips back here
  // with ?fork=<slug>. Finish the fork and bounce straight into the editor.
  const autoForkRan = useRef(false);
  useEffect(() => {
    if (autoForkRan.current) return;
    const forkSlug = new URLSearchParams(window.location.search).get("fork");
    if (!forkSlug) return;
    autoForkRan.current = true;
    void (async () => {
      try {
        const { template } = await forkMutation.mutateAsync({
          stockSlug: forkSlug,
        });
        router.replace(`/templates/${template.slug}`);
      } catch {
        // Guest never authed, or fork failed — drop the param so we don't loop.
        router.replace("/");
      }
    })();
  }, [forkMutation, router]);

  const handleOpenTemplate = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, item: StockItem) => {
      e.preventDefault();
      setSelected(item);
    },
    [],
  );

  const grouped = useMemo(() => {
    const data: StockItem[] = stockQuery.data ?? [];
    const groups = new Map<string, { name: string; items: StockItem[] }>();
    for (const item of data) {
      const key = item.category?.slug ?? "__uncategorized";
      const name = item.category?.name ?? "Uncategorized";
      if (!groups.has(key)) groups.set(key, { name, items: [] });
      groups.get(key)!.items.push(item);
    }
    return Array.from(groups.entries()).map(([slug, g]) => ({
      slug,
      name: g.name,
      items: g.items,
    }));
  }, [stockQuery.data]);

  // The card grid renders an SVG <TemplatePreview> per item; reconciling all of
  // them whenever `selected` toggles is what janks dialog open/close. Memoizing
  // on the data + stable handler keeps the same elements across dialog state
  // changes, so React skips the grid subtree entirely.
  const content = useMemo(() => {
    if (stockQuery.isLoading) {
      return Array.from({ length: SKELETON_GROUPS }).map((_, gi) => (
        <section key={gi} className="flex flex-col gap-3">
          <div className="h-4 w-32 animate-pulse rounded bg-[#1f2937]" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: CATEGORY_SKELETON_COUNT }).map((_, i) => (
              <TemplateCardSkeleton key={i} />
            ))}
          </div>
        </section>
      ));
    }
    if (grouped.length === 0) {
      return (
        <div className="rounded-md border border-[#1f2937] bg-[#0b0f1a] px-4 py-6 text-sm text-[#9ca3af]">
          No templates yet. Admins can publish stock templates from{" "}
          <code className="rounded bg-[#1f2937] px-1.5 py-0.5 text-xs">
            /admin
          </code>
          .
        </div>
      );
    }
    return grouped.map((group) => (
      <section key={group.slug} className="flex flex-col gap-3">
        <h3 className="text-sm font-medium uppercase tracking-wide text-[#9ca3af]">
          {group.name}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {group.items.map((item) => (
            <TemplateCard
              key={item.id}
              href="#"
              onClick={(e) => handleOpenTemplate(e, item)}
              prefetch={false}
              name={item.name}
              tags={item.tags}
              thumbnailUrl={item.thumbnailUrl}
              document={item.documentJson ?? undefined}
            />
          ))}
        </div>
      </section>
    ));
  }, [stockQuery.isLoading, grouped, handleOpenTemplate]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-[#e5e7eb]">Templates</h2>
        <p className="mt-1 text-sm text-[#9ca3af]">
          Open a template to jump straight into editing. Your own copy is forked
          automatically.
        </p>
      </div>

      {content}

      <TemplateForkDialog
        stock={
          selected
            ? {
                slug: selected.slug,
                name: selected.name,
                description: selected.description,
                thumbnailUrl: selected.thumbnailUrl,
                document: selected.documentJson,
              }
            : null
        }
        loggedIn={loggedIn}
        lastUsed={lastUsed}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
