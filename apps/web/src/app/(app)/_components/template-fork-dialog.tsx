"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, XIcon } from "lucide-react";

import { AuthProviders } from "@/components/auth-button";
import { authClient } from "@/server/better-auth/client";
import { TemplatePreview } from "@/app/(app)/_components/template-preview";
import type { TemplateDocument } from "@/components/template-editor/types";
import {
  Dialog,
  DialogClose,
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
  const { data: session } = authClient.useSession();
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
    // First persisting action → mint a guest session only if there's no
    // session at all. An existing anon session must NOT re-sign-in (better
    // -auth rejects that); it can fork directly. Browsing stays sessionless.
    if (!session) {
      const res = await authClient.signIn.anonymous();
      if (res.error) return;
    }
    const { template } = await forkMutation.mutateAsync({
      stockSlug: stock.slug,
    });
    router.push(`/templates/${template.slug}`);
  };

  return (
    <Dialog open={Boolean(stock)} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-5 border-none bg-[#0b0f17] p-5 text-zinc-100 shadow-2xl shadow-black/60 ring-1 ring-white/10 sm:max-w-2xl"
      >
        <DialogClose
          className="absolute top-3.5 right-3.5 rounded-md p-1.5 text-zinc-500 transition-colors outline-none hover:bg-white/5 hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-white/20"
          aria-label="Close"
        >
          <XIcon className="size-4" />
        </DialogClose>

        <DialogHeader className="pr-8">
          <DialogTitle className="text-lg font-semibold tracking-tight text-white">
            {stock?.name}
          </DialogTitle>
          {stock?.description ? (
            <DialogDescription className="text-sm leading-relaxed text-zinc-400">
              {stock.description}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="aspect-[1200/630] w-full overflow-hidden rounded-xl bg-[#0b0f1a] ring-1 ring-white/10 ring-inset">
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
            <div className="h-full w-full animate-pulse bg-[#11151f]" />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => void handleFork()}
            disabled={forkMutation.isPending}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#7c5cff] px-4 text-sm font-semibold text-white shadow-lg shadow-[#7c5cff]/25 transition hover:bg-[#6b4be0] focus-visible:ring-2 focus-visible:ring-[#7c5cff]/50 focus-visible:outline-none disabled:opacity-60"
          >
            {forkMutation.isPending ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Opening…
              </>
            ) : loggedIn ? (
              "Edit this template"
            ) : (
              "Edit as guest"
            )}
          </button>

          {!loggedIn ? (
            <>
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-200/90">
                <strong className="font-semibold text-amber-200">
                  Heads up:
                </strong>{" "}
                guest work is saved to this browser only, and links you share
                as a guest stop working once you create an account.
              </p>

              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-white/10" />
                <span className="text-xs whitespace-nowrap text-zinc-500">
                  or sign in to save your work
                </span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <AuthProviders
                lastUsed={lastUsed}
                callbackURL={`/?fork=${stock?.slug ?? ""}`}
              />
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
