"use client";

import { driver, type Driver } from "driver.js";
import { useCallback, useEffect, useRef } from "react";

import "driver.js/dist/driver.css";

import { EXPORT_TOUR_STEPS } from "./export-tour-steps";
import { useTourStore } from "./tour-store";

/**
 * Drives the export-panel walkthrough. Unlike the variables tour it seeds no
 * document state — every anchor already exists once the panel is open — so it
 * only has to keep the panel from closing under driver.js's overlay (via
 * `exportTourActive`) and tear that flag down on teardown.
 */
export function useExportTour() {
  const driverRef = useRef<Driver | null>(null);
  const nudgeRef = useRef<((e: MouseEvent) => void) | null>(null);

  const cleanup = useCallback(() => {
    useTourStore.getState().setExportTourActive(false);
    if (nudgeRef.current) {
      document.removeEventListener("click", nudgeRef.current, true);
      nudgeRef.current = null;
    }
  }, []);

  const start = useCallback(
    (opts?: { onComplete?: () => void; enforce?: boolean }) => {
      if (driverRef.current) return;
      const { onComplete, enforce = false } = opts ?? {};
      let reachedEnd = false;

      useTourStore.getState().setExportTourActive(true);

      const d = driver({
        showProgress: true,
        allowClose: !enforce,
        overlayOpacity: 0.6,
        stagePadding: 6,
        stageRadius: 8,
        smoothScroll: true,
        popoverClass: "wk-variables-tour",
        nextBtnText: "Next →",
        prevBtnText: "← Back",
        doneBtnText: "Got it",
        steps: EXPORT_TOUR_STEPS,
        // Record completion on entry to the last step — the "Got it" click
        // destroys the tour synchronously and would outrace a post-transition
        // hook (same reasoning as the variables tour).
        onHighlightStarted: (_el, _step, o) => {
          if (o.state.activeIndex === EXPORT_TOUR_STEPS.length - 1) {
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

      // While enforced, overlay clicks can't dismiss — shake the card instead.
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

      // Let the panel's open animation settle before driver.js measures.
      requestAnimationFrame(() => window.setTimeout(() => d.drive(), 120));
    },
    [cleanup],
  );

  // Safety net: if the panel/editor unmounts mid-tour, tear down cleanly.
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
