"use client";

import { driver, type Driver } from "driver.js";
import { useCallback, useEffect, useRef } from "react";

import "driver.js/dist/driver.css";

import { useEditor } from "../store";
import type { Artboard, EditorNode, ParamsSchema } from "../types";
import { VARIABLES_TOUR_STEPS } from "./tour-steps";
import { useTourStore } from "./tour-store";

/**
 * Slice of editor state the tour mutates while seeding its demo. Captured
 * before the tour and written back verbatim on teardown so the user's
 * document — and the autosave `dirty` flag — is left exactly as found.
 */
interface Snapshot {
  nodes: EditorNode[];
  artboard: Artboard;
  paramsSchema: ParamsSchema;
  selectedId: string | null;
  editingId: string | null;
  dirty: boolean;
  past: ReturnType<typeof useEditor.getState>["past"];
  future: ReturnType<typeof useEditor.getState>["future"];
  lastOpKey: string | null;
  lastOpTime: number;
}

export function useVariablesTour() {
  const driverRef = useRef<Driver | null>(null);
  const snapRef = useRef<Snapshot | null>(null);
  const nudgeRef = useRef<((e: MouseEvent) => void) | null>(null);

  const cleanup = useCallback(() => {
    useTourStore.getState().setForcedPanel(null);
    if (nudgeRef.current) {
      document.removeEventListener("click", nudgeRef.current, true);
      nudgeRef.current = null;
    }
    const snap = snapRef.current;
    snapRef.current = null;
    if (snap) useEditor.setState({ ...snap });
  }, []);

  const start = useCallback(
    (opts?: { onComplete?: () => void; enforce?: boolean }) => {
    if (driverRef.current) return;
    const { onComplete, enforce = false } = opts ?? {};
    let reachedEnd = false;

    const ed = useEditor.getState();
    snapRef.current = {
      nodes: ed.nodes,
      artboard: ed.artboard,
      paramsSchema: ed.paramsSchema,
      selectedId: ed.selectedId,
      editingId: ed.editingId,
      dirty: ed.dirty,
      past: ed.past,
      future: ed.future,
      lastOpKey: ed.lastOpKey,
      lastOpTime: ed.lastOpTime,
    };

    // Seed a self-contained demo so every anchored step has a real target.
    ed.addParam("headline", { kind: "string", default: "Your headline" });
    ed.addParam("brandColor", { kind: "color", default: "#6366f1" });
    ed.addNode("text");
    const id = useEditor.getState().selectedId;
    if (id) {
      ed.updateNode(id, { text: "Your headline" });
      ed.bindToParam(
        id,
        "text",
        "headline",
        { kind: "string", default: "Your headline" },
        false,
      );
      ed.bindToParam(
        id,
        "color",
        "brandColor",
        { kind: "color", default: "#6366f1" },
        true,
      );
    }
    useTourStore.getState().setForcedPanel("variables");

    const d = driver({
      showProgress: true,
      // First time through, no bail-out: overlay clicks just shake the card
      // (wired below). Once they've finished once, replays close freely.
      allowClose: !enforce,
      overlayOpacity: 0.6,
      stagePadding: 6,
      stageRadius: 8,
      smoothScroll: true,
      popoverClass: "wk-variables-tour",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Got it",
      steps: VARIABLES_TOUR_STEPS,
      onHighlighted: (_el, _step, opts) => {
        if (opts.state.activeIndex === VARIABLES_TOUR_STEPS.length - 1) {
          reachedEnd = true;
        }
      },
      onDestroyed: () => {
        driverRef.current = null;
        cleanup();
        if (reachedEnd) onComplete?.();
      },
    });
    driverRef.current = d;

    // While enforced, overlay clicks can't dismiss — shake the card instead
    // so it's clear they should use the buttons to move on.
    if (enforce) {
      const nudge = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target?.closest(".driver-overlay")) return;
        const pop = document.querySelector<HTMLElement>(
          ".driver-popover.wk-variables-tour",
        );
        if (!pop) return;
        pop.classList.remove("wk-nudge");
        void pop.offsetWidth; // restart the animation
        pop.classList.add("wk-nudge");
      };
      nudgeRef.current = nudge;
      document.addEventListener("click", nudge, true);
    }

    // Let React flush the seeded state + the forced panel before driver.js
    // measures anchors.
    requestAnimationFrame(() =>
      window.setTimeout(() => d.drive(), 60),
    );
  }, [cleanup]);

  // Safety net: if the editor unmounts mid-tour, tear down cleanly.
  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, []);

  return { start };
}
