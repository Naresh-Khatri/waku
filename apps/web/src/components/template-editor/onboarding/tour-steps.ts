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
        "variables let you make it once and remix forever. same layout, new headline, new colors. 60 secs, you got this.",
    },
  },
  {
    element: '[data-tour="rail-variables"]',
    popover: {
      side: "right",
      align: "start",
      title: "the variables tab",
      description:
        "every reusable value lives here. basically your template's brand kit, but private.",
    },
  },
  {
    element: '[data-tour="variables-panel"]',
    popover: {
      side: "right",
      align: "center",
      title: "what even is a variable",
      description:
        "a <b>name</b>, a <b>type</b> (text or color), and a <b>default</b> that shows until someone says otherwise. that's it. not deep.",
    },
  },
  {
    element: '[data-tour="new-variable"]',
    popover: {
      side: "right",
      align: "start",
      title: "spawn one here",
      description:
        "name it, pick a type, give it a default. takes like 3 seconds fr.",
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
    popover: {
      title: "plot twist: it does nothing yet 😅",
      description:
        "a variable on its own just sits there. the real magic is <b>binding</b> it to something on the canvas.",
    },
  },
  {
    element: '[data-tour="contextual-bar"]',
    popover: {
      side: "bottom",
      align: "center",
      title: "click a thing, get this bar",
      description:
        "select any element and this lil floating toolbar pops up. you already know this one.",
    },
  },
  {
    element: '[data-tour="bind-button"]',
    popover: {
      side: "bottom",
      align: "start",
      title: "the chain icon is the move",
      description:
        "sits next to text & color. tap it to link this field to a variable, or make a fresh one right there.",
    },
  },
  {
    element: '[data-tour="bound-pill"]',
    popover: {
      side: "bottom",
      align: "start",
      title: "bound. it's giving reusable 🔗",
      description:
        "the input turns into a pill. this field now follows the variable everywhere. edit the variable and this moves with it.",
    },
  },
  {
    popover: {
      title: "that's literally it 🚀",
      description:
        "define in <b>variables</b>, <b>bind</b> on canvas, override per use. wanna see it again? hit the tour button anytime.",
    },
  },
];
