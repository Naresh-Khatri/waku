"use client";

import { create } from "zustand";

import type { TabId } from "../left-rail";

/**
 * Lets the onboarding tour drive editor chrome that is otherwise local
 * component state. `forcedPanel` pins a left-rail panel open for the
 * duration of a tour step; `null` returns control to the user.
 */
interface TourStore {
  forcedPanel: TabId | null;
  setForcedPanel: (tab: TabId | null) => void;
  // True while the export-panel walkthrough runs. The panel guards its own
  // outside-click dismissal against this so driver.js overlay clicks don't
  // close the panel mid-tour.
  exportTourActive: boolean;
  setExportTourActive: (active: boolean) => void;
}

export const useTourStore = create<TourStore>((set) => ({
  forcedPanel: null,
  setForcedPanel: (forcedPanel) => set({ forcedPanel }),
  exportTourActive: false,
  setExportTourActive: (exportTourActive) => set({ exportTourActive }),
}));
