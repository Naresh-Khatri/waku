import type { Node, ParamsSchema } from "@waku/ir";

export const slug = "gradient" as const;
export const version = 1 as const;

// NOTE: Gradient stop colors and angle are baked into the IR for v1.
// (Gradient.stops takes literal strings; ParamRef inside stops is a v1.1 task.)
export const params: ParamsSchema = {
  title: { kind: "string", minLen: 1, maxLen: 120 },
  subtitle: { kind: "string", minLen: 0, maxLen: 200, default: "" },
  fg: { kind: "color", default: "#FFFFFF" },
};

export const ir: Node = {
  type: "frame",
  w: 1200,
  h: 630,
  bg: {
    type: "linear",
    angle: 135,
    stops: [
      { color: "#7C5CFF", offset: 0 },
      { color: "#FF6B9A", offset: 1 },
    ],
  },
  children: [
    {
      type: "stack",
      dir: "col",
      gap: 16,
      pad: 80,
      w: "fill",
      h: "fill",
      justify: "center",
      align: "start",
      children: [
        {
          type: "text",
          value: { $param: "title" },
          font: { family: "Inter", weight: 800 },
          size: 92,
          color: { $param: "fg", default: "#FFFFFF" },
          lineHeight: 1.05,
          maxLines: 3,
        },
        {
          type: "text",
          value: { $param: "subtitle", default: "" },
          font: { family: "Inter", weight: 400 },
          size: 30,
          color: { $param: "fg", default: "#FFFFFF" },
          lineHeight: 1.3,
          maxLines: 2,
        },
      ],
    },
  ],
};
