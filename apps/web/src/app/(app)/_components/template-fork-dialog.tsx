"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";

import { AuthProviders } from "@/components/auth-button";
import { TemplatePreview } from "@/app/(app)/_components/template-preview";
import type { TemplateDocument } from "@/components/template-editor/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AuthProvider } from "@/server/better-auth/last-used";
import { api } from "@/trpc/react";

// Mirrors the catalogue card data: a stock item carries a thumbnail OR a
// document (listStock never ships both), so we render the same way cards do.
export type ForkDialogStock = {
  slug: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  document: TemplateDocument | null;
};

export function TemplateForkDialog({
  stock,
  loggedIn,
  lastUsed,
  onOpenChange,
}: {
  stock: ForkDialogStock | null;
  loggedIn: boolean;
  lastUsed: AuthProvider | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const forkMutation = api.template.forkFromStock.useMutation();

  // A thumbnail is a cheap <img>, but the document fallback renders an SVG
  // foreignObject that lays out every node — mounting that in the same commit
  // that opens the dialog janks the open. Let the dialog paint first, then
  // bring the live preview in a frame later. (No-op when a thumbnail exists.)
  const needsLivePreview = Boolean(stock && !stock.thumbnailUrl);
  const [previewReady, setPreviewReady] = useState(false);
  useEffect(() => {
    if (!needsLivePreview) {
      setPreviewReady(false);
      return;
    }
    const raf = requestAnimationFrame(() => setPreviewReady(true));
    return () => cancelAnimationFrame(raf);
  }, [needsLivePreview]);

  const handleFork = async () => {
    if (!stock || forkMutation.isPending) return;
    const { template } = await forkMutation.mutateAsync({
      stockSlug: stock.slug,
    });
    router.push(`/templates/${template.slug}`);
  };

  return (
    <Dialog open={Boolean(stock)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{stock?.name}</DialogTitle>
          {stock?.description ? (
            <DialogDescription>{stock.description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="aspect-[1200/630] w-full overflow-hidden rounded-lg border border-[#1f2937] bg-[#0b0f1a]">
          {stock?.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={stock.thumbnailUrl}
              alt={`${stock.name} preview`}
              className="h-full w-full object-cover"
            />
          ) : stock?.document && previewReady ? (
            <TemplatePreview document={stock.document} />
          ) : (
            <div className="h-full w-full animate-pulse bg-[#0b0f1a]" />
          )}
        </div>

        {loggedIn ? (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => void handleFork()}
              disabled={forkMutation.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-[#7c5cff] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#6b4be0] disabled:opacity-60"
            >
              {forkMutation.isPending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Opening…
                </>
              ) : (
                "Edit this template"
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Sign in to fork this template and start editing.
            </p>
            <AuthProviders
              lastUsed={lastUsed}
              callbackURL={`/?fork=${stock?.slug ?? ""}`}
              className="max-w-xs"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
