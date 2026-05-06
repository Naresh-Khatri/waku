import type { Node, ParamsSchema } from "@waku/ir";

export const slug = "repo" as const;
export const version = 1 as const;

export const params: ParamsSchema = {
  repo: { kind: "string", minLen: 1, maxLen: 80 },
  desc: { kind: "string", minLen: 0, maxLen: 240, default: "" },
  lang: { kind: "string", minLen: 0, maxLen: 30, default: "" },
  stars: { kind: "string", minLen: 0, maxLen: 10, default: "" },
  langColor: { kind: "color", default: "#3178C6" },
  bg: { kind: "color", default: "#0D1117" },
  fg: { kind: "color", default: "#E6EDF3" },
  muted: { kind: "color", default: "#7D8590" },
};

export const ir: Node = {
  type: "frame",
  w: 1200,
  h: 630,
  bg: { $param: "bg", default: "#0D1117" },
  children: [
    {
      type: "stack",
      dir: "col",
      gap: 36,
      pad: 80,
      w: "fill",
      h: "fill",
      justify: "between",
      align: "start",
      children: [
        {
          type: "stack",
          dir: "col",
          gap: 24,
          align: "start",
          children: [
            {
              type: "text",
              value: { $param: "repo" },
              font: { family: "Inter", weight: 800 },
              size: 72,
              color: { $param: "fg", default: "#E6EDF3" },
              lineHeight: 1.1,
              maxLines: 2,
            },
            {
              type: "text",
              value: { $param: "desc", default: "" },
              font: { family: "Inter", weight: 400 },
              size: 30,
              color: { $param: "muted", default: "#7D8590" },
              lineHeight: 1.4,
              maxLines: 4,
            },
          ],
        },
        {
          type: "stack",
          dir: "row",
          gap: 32,
          align: "center",
          children: [
            {
              type: "stack",
              dir: "row",
              gap: 12,
              align: "center",
              children: [
                {
                  type: "shape",
                  kind: "circle",
                  w: 18,
                  h: 18,
                  fill: { $param: "langColor", default: "#3178C6" },
                },
                {
                  type: "text",
                  value: { $param: "lang", default: "" },
                  font: { family: "Inter", weight: 600 },
                  size: 26,
                  color: { $param: "fg", default: "#E6EDF3" },
                },
              ],
            },
            {
              type: "stack",
              dir: "row",
              gap: 8,
              align: "center",
              children: [
                {
                  type: "text",
                  value: "★",
                  font: { family: "Inter", weight: 700 },
                  size: 26,
                  color: { $param: "muted", default: "#7D8590" },
                },
                {
                  type: "text",
                  value: { $param: "stars", default: "" },
                  font: { family: "Inter", weight: 600 },
                  size: 26,
                  color: { $param: "fg", default: "#E6EDF3" },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};
