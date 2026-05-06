import type { Node, ParamsSchema } from "@waku/ir";

export const slug = "quote" as const;
export const version = 1 as const;

export const params: ParamsSchema = {
  quote: { kind: "string", minLen: 1, maxLen: 320 },
  author: { kind: "string", minLen: 1, maxLen: 80 },
  role: { kind: "string", minLen: 0, maxLen: 80, default: "" },
  bg: { kind: "color", default: "#0F172A" },
  fg: { kind: "color", default: "#F8FAFC" },
  accent: { kind: "color", default: "#22D3EE" },
};

export const ir: Node = {
  type: "frame",
  w: 1200,
  h: 630,
  bg: { $param: "bg", default: "#0F172A" },
  children: [
    {
      type: "stack",
      dir: "col",
      gap: 32,
      pad: 96,
      w: "fill",
      h: "fill",
      justify: "center",
      align: "start",
      children: [
        {
          type: "text",
          value: "“",
          font: { family: "Inter", weight: 800 },
          size: 140,
          color: { $param: "accent", default: "#22D3EE" },
          lineHeight: 0.8,
        },
        {
          type: "text",
          value: { $param: "quote" },
          font: { family: "Inter", weight: 600 },
          size: 48,
          color: { $param: "fg", default: "#F8FAFC" },
          lineHeight: 1.25,
          maxLines: 5,
        },
        {
          type: "stack",
          dir: "col",
          gap: 4,
          children: [
            {
              type: "text",
              value: { $param: "author" },
              font: { family: "Inter", weight: 700 },
              size: 28,
              color: { $param: "fg", default: "#F8FAFC" },
            },
            {
              type: "text",
              value: { $param: "role", default: "" },
              font: { family: "Inter", weight: 400 },
              size: 22,
              color: { $param: "accent", default: "#22D3EE" },
            },
          ],
        },
      ],
    },
  ],
};
