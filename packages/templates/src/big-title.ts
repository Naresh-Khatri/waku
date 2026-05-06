import type { ParamsSchema, Node } from "@waku/ir";

export const slug = "big-title" as const;
export const version = 1 as const;

export const params: ParamsSchema = {
  title: { kind: "string", minLen: 1, maxLen: 120 },
  subtitle: { kind: "string", minLen: 0, maxLen: 200, default: "" },
  bg: { kind: "color", default: "#0B1020" },
  fg: { kind: "color", default: "#FFFFFF" },
  accent: { kind: "color", default: "#7C5CFF" },
};

export const ir: Node = {
  type: "frame",
  w: 1200,
  h: 630,
  bg: { $param: "bg", default: "#0B1020" },
  children: [
    {
      type: "stack",
      dir: "col",
      gap: 24,
      pad: 80,
      w: "fill",
      h: "fill",
      justify: "center",
      align: "start",
      children: [
        {
          type: "shape",
          kind: "rect",
          w: 80,
          h: 8,
          radius: 4,
          fill: { $param: "accent", default: "#7C5CFF" },
        },
        {
          type: "text",
          value: { $param: "title" },
          font: { family: "Inter", weight: 800 },
          size: 84,
          color: { $param: "fg", default: "#FFFFFF" },
          lineHeight: 1.05,
          maxLines: 3,
        },
        {
          type: "text",
          value: { $param: "subtitle", default: "" },
          font: { family: "Inter", weight: 400 },
          size: 32,
          color: { $param: "fg", default: "#FFFFFF" },
          lineHeight: 1.3,
          maxLines: 2,
        },
      ],
    },
  ],
};
