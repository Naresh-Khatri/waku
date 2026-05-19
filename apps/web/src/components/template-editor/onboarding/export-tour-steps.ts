import type { DriveStep } from "driver.js";

/**
 * The export-panel walkthrough, in order. Anchored steps target elements that
 * exist as soon as the panel opens on the Preview tab; if the template has no
 * live URL yet, the preview/actions anchors are absent and driver.js falls
 * back to a centered modal for those steps. Kept short on purpose.
 */
export const EXPORT_TOUR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="export-params"]',
    popover: {
      side: "right",
      align: "start",
      title: "tweak values live",
      description:
        "every bound variable lands here. change one and the preview updates instantly — no save needed.",
    },
  },
  {
    element: '[data-tour="export-preview"]',
    popover: {
      side: "left",
      align: "center",
      title: "see it in the wild",
      description:
        "exactly how the card looks when shared. flip platforms below to sanity-check the crop.",
    },
  },
  {
    element: '[data-tour="export-actions"]',
    popover: {
      side: "top",
      align: "center",
      title: "copy or download",
      description:
        "grab the live URL (stays dynamic) or download a baked image. that's the whole flow 🎉",
    },
  },
];
