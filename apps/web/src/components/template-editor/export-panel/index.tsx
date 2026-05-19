"use client";

import { Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/trpc/react";
import { useRenderedImage, type Platform } from "./og-preview";
import { useIsMobile } from "../use-is-mobile";
import { useEditor } from "../store";
import { isParamRef, paramsWithDefaults } from "../types";
import type { Artboard, EditorNode, TemplateDocument } from "../types";
import { searchFromParams } from "../url-params";
import { useExportTour } from "../onboarding/use-export-tour";
import { useTourStore } from "../onboarding/tour-store";
import { TRANSITION } from "./constants";
import { Header, type Tab } from "./header";
import { HistoryTab } from "./history";
import { PreviewTab } from "./preview";

const TOUR_SEEN_KEY = "wk:exportTourSeen";

type Props = {
  liveUrl?: string;
  templateId: string;
  handle: string;
  templateSlug: string;
  renderBase: string;
  // Bumped by the shell after each successful autosave; cache-busts the OG
  // fetch so post-save changes appear without manual refresh.
  renderRev?: number;
};

export function ExportPanel({
  liveUrl,
  templateId,
  handle,
  templateSlug,
  renderBase,
  renderRev,
}: Props) {
  const paramsSchema = useEditor((s) => s.paramsSchema);
  const draftValues = useEditor((s) => s.draftValues);
  const setDraftValue = useEditor((s) => s.setDraftValue);
  const loadDocument = useEditor((s) => s.loadDocument);
  const nodes = useEditor((s) => s.nodes);
  const artboard = useEditor((s) => s.artboard);

  const expanded = useEditor((s) => s.previewOpen);
  const setExpanded = useEditor((s) => s.setPreviewOpen);

  const [tab, setTab] = useState<Tab>("preview");
  const [platform, setPlatform] = useState<Platform>("x");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useIsMobile();

  const { start: startTour } = useExportTour();
  const tourFired = useRef(false);

  useEffect(() => {
    // Mobile uses the Drawer's own overlay-tap dismissal.
    if (!expanded || isMobile) return;
    const onMouseDown = (e: MouseEvent) => {
      // Don't let clicks on the tour's overlay dismiss the panel.
      if (useTourStore.getState().exportTourActive) return;
      const node = panelRef.current;
      if (!node) return;
      if (e.target instanceof Node && !node.contains(e.target)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [expanded, setExpanded, isMobile]);

  // First time the panel is opened (desktop, with a live URL to demo
  // against), auto-run a short walkthrough. Locked until finished, so a
  // bail-out greets them again next time; replays close freely.
  useEffect(() => {
    if (!expanded || isMobile || tourFired.current) return;
    if (typeof window === "undefined" || !liveUrl) return;
    if (window.localStorage.getItem(TOUR_SEEN_KEY)) return;
    tourFired.current = true;
    const t = window.setTimeout(
      () =>
        startTour({
          enforce: true,
          onComplete: () =>
            window.localStorage.setItem(TOUR_SEEN_KEY, "1"),
        }),
      400,
    );
    return () => window.clearTimeout(t);
  }, [expanded, isMobile, liveUrl, startTour]);

  const utils = api.useUtils();
  const snapshots = api.template.listSnapshots.useQuery(
    { templateId },
    { enabled: expanded },
  );
  const create = api.template.createSnapshot.useMutation({
    onSuccess: () => {
      utils.template.listSnapshots.invalidate({ templateId });
      setTab("history");
    },
  });
  const restore = api.template.restoreSnapshot.useMutation({
    onSuccess: (head) => {
      if (head?.documentJson) {
        loadDocument(head.documentJson as TemplateDocument);
      }
    },
  });
  const rename = api.template.renameSnapshot.useMutation({
    onSuccess: () => utils.template.listSnapshots.invalidate({ templateId }),
  });
  const del = api.template.deleteSnapshot.useMutation({
    onSuccess: () => utils.template.listSnapshots.invalidate({ templateId }),
  });

  // Only surface params that are actually wired into a node or the artboard —
  // an unbound schema entry has no visible effect, so editing it is just noise.
  const boundParams = useMemo(
    () => collectBoundParams(nodes, artboard),
    [nodes, artboard],
  );
  const entries = useMemo(
    () =>
      Object.entries(paramsSchema)
        .filter(([name]) => boundParams.has(name))
        .sort(([a], [b]) => a.localeCompare(b)),
    [paramsSchema, boundParams],
  );

  // Bake effective params (drafts falling back to schema defaults) into every
  // URL we build. The renderer reads only what's in the query string, so a
  // bare URL would silently drop bound-but-not-overridden params and render
  // their fallbacks — diverging from the canvas which uses effective values.
  const effective = paramsWithDefaults(draftValues, paramsSchema);
  const qs = searchFromParams(effective, paramsSchema).toString();
  const appendQs = (base: string) =>
    qs.length === 0 ? base : `${base}${base.includes("?") ? "&" : "?"}${qs}`;
  const fullUrl = liveUrl ? appendQs(liveUrl) : null;
  const { imageUrl, status } = useRenderedImage(
    liveUrl ? fullUrl : null,
    renderRev,
  );
  const buildSnapshotUrl = (version: number): string =>
    appendQs(`${renderBase}/r/${handle}/${templateSlug}/${version}`);

  const snapshotCount = snapshots.data?.length ?? 0;
  const restoringId =
    restore.isPending && restore.variables?.versionId
      ? restore.variables.versionId
      : null;

  const body =
    tab === "preview" ? (
      <PreviewTab
        entries={entries}
        draftValues={draftValues}
        setDraftValue={setDraftValue}
        fullUrl={fullUrl}
        liveUrl={liveUrl}
        templateSlug={templateSlug}
        imageUrl={imageUrl}
        status={status}
        platform={platform}
        onPlatform={setPlatform}
        handle={handle}
        mobile={isMobile}
      />
    ) : (
      <HistoryTab
        snapshots={snapshots.data}
        isLoading={snapshots.isLoading}
        buildSnapshotUrl={buildSnapshotUrl}
        onCreate={() => create.mutate({ templateId })}
        creating={create.isPending}
        createError={create.error?.message ?? null}
        restoringId={restoringId}
        onRestore={(id) => restore.mutate({ versionId: id })}
        onRename={(id, label) => rename.mutate({ versionId: id, label })}
        onDelete={(id) => del.mutate({ versionId: id })}
      />
    );

  if (isMobile) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="default" onClick={() => setExpanded(true)}>
              <Upload />
              <span>Export</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export to a static image</p>
          </TooltipContent>
        </Tooltip>
        <Drawer open={expanded} onOpenChange={setExpanded}>
          <DrawerContent
            aria-describedby={undefined}
            className="z-[71] h-[50dvh] overflow-hidden text-xs"
          >
            <DrawerTitle className="sr-only">Export</DrawerTitle>
            <Header
              tab={tab}
              onTab={setTab}
              snapshotCount={snapshotCount}
              status={tab === "preview" ? status : null}
              onClose={() => setExpanded(false)}
              mobile
            />
            <DrawerBody>{body}</DrawerBody>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      <AnimatePresence>
        {expanded ? (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setExpanded(false)}
            className="backdrop-blur-xs fixed inset-0 z-[5] bg-black/10"
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {!expanded ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                key="trigger"
                layoutId="export-panel"
                transition={TRANSITION}
                onClick={() => setExpanded(true)}
                title="Show preview"
              >
                <Button variant={"default"}>
                  <Upload />
                  <span>Export</span>
                </Button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export to a static image</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <motion.div
            key="panel"
            ref={panelRef}
            layoutId="export-panel"
            transition={TRANSITION}
            className="fixed right-3 top-2 z-[60] flex h-[475px] w-[720px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-md border border-zinc-200 bg-white text-xs shadow-md"
          >
            <Header
              tab={tab}
              onTab={setTab}
              snapshotCount={snapshotCount}
              status={tab === "preview" ? status : null}
              onClose={() => setExpanded(false)}
            />

            {body}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Walks nodes + artboard for any { $param: name } reference (including those
// nested inside Paint stops/shadows). The filter is intentionally permissive —
// we don't care *where* a param is bound, only that it is.
function collectBoundParams(
  nodes: EditorNode[],
  artboard: Artboard,
): Set<string> {
  const out = new Set<string>();
  const visit = (v: unknown): void => {
    if (v === null || v === undefined) return;
    if (typeof v !== "object") return;
    if (isParamRef(v as never)) {
      out.add((v as { $param: string }).$param);
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v) visit(item);
      return;
    }
    for (const key of Object.keys(v)) {
      visit((v as Record<string, unknown>)[key]);
    }
  };
  visit(nodes);
  visit(artboard);
  return out;
}
