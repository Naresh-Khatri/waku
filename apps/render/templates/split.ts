import type { Node, ParamsSchema } from "@waku/ir";

export const slug = "split" as const;
export const version = 1 as const;

export const params: ParamsSchema = {
  title: { kind: "string", minLen: 1, maxLen: 120 },
  desc: { kind: "string", minLen: 0, maxLen: 240, default: "" },
  image: { kind: "url" },
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
      dir: "row",
      gap: 0,
      w: "fill",
      h: "fill",
      align: "stretch",
      children: [
        {
          type: "stack",
          dir: "col",
          gap: 20,
          pad: { t: 80, r: 56, b: 80, l: 80 },
          w: 660,
          h: "fill",
          justify: "center",
          align: "start",
          children: [
            {
              type: "shape",
              kind: "rect",
              w: 64,
              h: 6,
              radius: 3,
              fill: { $param: "accent", default: "#7C5CFF" },
            },
            {
              type: "text",
              value: { $param: "title" },
              font: { family: "Inter", weight: 800 },
              size: 64,
              color: { $param: "fg", default: "#FFFFFF" },
              lineHeight: 1.1,
              maxLines: 4,
            },
            {
              type: "text",
              value: { $param: "desc", default: "" },
              font: { family: "Inter", weight: 400 },
              size: 26,
              color: { $param: "fg", default: "#FFFFFF" },
              lineHeight: 1.4,
              maxLines: 3,
            },
          ],
        },
        {
          type: "image",
          src: { $param: "image" },
          fit: "cover",
          w: 540,
          h: 630,
        },
      ],
    },
  ],
};
