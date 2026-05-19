import type { DriveStep } from "driver.js";

/**
 * The variables & binding walkthrough, in order. Every targeted element is
 * arranged to exist for the whole tour by `use-variables-tour` before
 * `drive()` runs, so steps need no per-step setup and the sequence can't
 * desync. Element-less steps render as centered modals.
 */
export const VARIABLES_TOUR_STEPS: DriveStep[] = [
  {
    popover: {
      title: "one design, infinite versions 🎨",
      description:
        "variables let you make it once and remix forever. same layout, new headline, new colors. 30 secs.",
    },
  },
  {
    element: '[data-tour="variables-panel"]',
    popover: {
      side: "right",
      align: "center",
      title: "the variables tab",
      description:
        "every reusable value lives here: a <b>name</b>, a <b>type</b> (text or color), and a <b>default</b>. spin up new ones with the + button.",
    },
  },
  {
    element: '[data-tour="variable-row"]',
    popover: {
      side: "right",
      align: "center",
      title: "it keeps tabs on itself",
      description:
        "shows everywhere it's used. change it once and everything linked updates. zero busywork.",
    },
  },
  {
    element: '[data-tour="bind-button"]',
    popover: {
      side: "bottom",
      align: "start",
      title: "now bind it 🔗",
      description:
        "a variable alone does nothing. select an element, hit the chain icon next to text/color to link it, or make a fresh one right there.",
    },
  },
  {
    element: '[data-tour="bound-pill"]',
    popover: {
      side: "bottom",
      align: "start",
      title: "that's literally it 🚀",
      description:
        "the field turns into a pill and follows the variable everywhere. replay this tour anytime from the tour button.",
    },
  },
];
