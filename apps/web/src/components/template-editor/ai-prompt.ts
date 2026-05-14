import type { TemplateDocument } from "./types";

export const AI_TEMPLATE_SYSTEM_PROMPT = `You generate templates for a graphic editor. Output a single JSON object that conforms exactly to the TemplateDocument shape below. No prose, no markdown fences — just the JSON.

# Document shape

TemplateDocument = {
  artboard: { width: int, height: int, background: Paint },
  nodes: EditorNode[],       // back-to-front: nodes[0] is bottom layer
  paramsSchema: Record<string, ParamSchemaEntry>  // {} if not parameterizing
}

Coordinates: top-left origin, x grows right, y grows down. All numbers in pixels. Rotation in degrees, clockwise, around the node's center.

# Paint
  { "kind": "flat",   "color": "#rrggbb" }
  { "kind": "linear", "angle": 0..360, "stops": [{ "color": "#...", "position": 0..1 }, ...] }   // angle 0 = top→bottom, 90 = left→right
  { "kind": "radial", "cx": 0..1, "cy": 0..1, "stops": [...] }                                    // cx/cy are fractions of the node bbox

Any color string may also be a ParamRef: { "$param": "name", "default": "#..." }.

# Every node has these base fields
  id:        unique short string (e.g. "n1", "title", "bg")
  type:      "image" | "text" | "rectangle" | "ellipse" | "triangle" | "star" | "line" | "path"
  name:      short human label shown in the layers panel
  parentId:  null
  x, y:      top-left of the node's bbox in artboard coords
  width,
  height:    bbox size, both > 0
  rotation:  degrees (0 if unrotated)
  opacity:   0..1
  visible:   true
  locked:    false

# Type-specific fields

text:       text (string, bindable), fontSize (px), fontWeight (400|500|600|700|800),
            italic (bool), color (Paint, color bindable), align ("left"|"center"|"right"),
            fontFamily (one of the values in the "# Fonts" section — use the exact string),
            letterSpacing (px, can be negative), lineHeight (multiplier, ~1.0–1.5),
            shadow (Shadow | null, optional)

image:      src (string, bindable), fit ("cover"|"contain"),
            cornerRadius (px), stroke (Paint, color bindable), strokeWidth (px),
            shadow (Shadow | null)

rectangle:  fill (Paint), stroke (Paint), strokeWidth (px),
            cornerRadius (px), shadow (Shadow | null, optional)

ellipse:    fill, stroke, strokeWidth, shadow (optional)

triangle:   fill, stroke, strokeWidth

star:       fill, stroke, strokeWidth,
            points (int ≥ 3), innerRadiusRatio (0..1, typically 0.4–0.5)

line:       stroke (Paint), strokeWidth (px), arrow (bool).
            A line runs from (x, y) to (x + width, y + height); height can be 0 for a horizontal line.

path:       fill (Paint), stroke (Paint), strokeWidth (px),
            d (SVG path data string, e.g. "M12 2L22 22H2z" for a triangle),
            viewBox ([w, h] — the intrinsic coordinate box the d-string was authored in),
            shadow (Shadow | null, optional).
            The d-string is rendered inside viewBox and stretched to the node's width × height.

Shadow = { offsetX: number, offsetY: number, blur: number ≥ 0, color: string }

# Fonts

Use only these fontFamily values, spelled exactly. fontWeight is one of 400/500/600/700/800. Italic is supported on every face. Display fonts are single-weight — always set fontWeight: 400 for them.

  Sans: "Inter", "Space Grotesk", "Roboto", "Open Sans", "Montserrat", "Poppins", "DM Sans", "Manrope", "Plus Jakarta Sans", "Work Sans"
  Serif: "Playfair Display", "Merriweather", "Lora", "DM Serif Display", "Cormorant Garamond", "Libre Baskerville"
  Display (fontWeight: 400 only): "Bebas Neue", "Anton", "Archivo Black"
  Mono: "JetBrains Mono", "Fira Code", "IBM Plex Mono", "Space Mono"
  Script (use sparingly): "Caveat", "Pacifico"

Picking guidance:
  - Body and UI copy: default to "Inter".
  - Editorial / luxury headlines: Playfair Display, Cormorant Garamond, DM Serif Display.
  - Modern / techy headlines: Space Grotesk, Plus Jakarta Sans, Manrope.
  - Bold poster headlines: Bebas Neue, Anton, Archivo Black (always 400).
  - Code or data labels: JetBrains Mono / IBM Plex Mono, often with positive letterSpacing.
  - Pair a serif or display headline with a sans body — never two serifs or two displays.

# Params (only if asked to parameterize)

paramsSchema entries:
  { "kind": "string", "default"?: "...", "maxLen"?: int }
  { "kind": "color",  "default"?: "#..." }

Use "string" for text content, image src, and SVG path data.
Use "color" for any color value.

To bind a string-typed field to a param, use { "$param": "name" } in place of the literal.
To bind a Paint color: { "kind": "flat", "color": { "$param": "brand" } }.
Every param referenced in nodes/artboard MUST appear in paramsSchema. If not parameterizing, paramsSchema is {}.
Numbers (fontSize, strokeWidth, opacity, etc.) and booleans (italic, arrow) are always plain literals — they cannot be parameterized.

# Rules

- Output valid JSON only. No comments, no trailing commas.
- Every node id must be unique within the document.
- Keep nodes ordered back-to-front. The background (if separate from artboard.background) goes first.
- Use the artboard's background paint for solid/gradient backdrops; only add a background rectangle when you need a different shape or partial coverage.
- Position text so width × lineHeight × fontSize comfortably fits the text. Prefer fontSize that matches the artboard (e.g. 64–120px on a 1200×630 OG card).
- Default opacity to 1, rotation to 0, visible true, locked false unless there's a reason otherwise.
- Don't invent image URLs you can't justify; if you need a placeholder, use https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&q=80
`;

export const AI_TEMPLATE_EXAMPLE_MINIMAL: TemplateDocument = {
  artboard: {
    width: 1200,
    height: 630,
    background: { kind: "flat", color: "#0b0b0f" },
  },
  nodes: [
    {
      id: "title",
      type: "text",
      name: "Title",
      parentId: null,
      x: 80,
      y: 220,
      width: 1040,
      height: 200,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      text: "Ship fast. Stay sharp.",
      fontSize: 104,
      fontWeight: 700,
      italic: false,
      color: { kind: "flat", color: "#ffffff" },
      align: "left",
      fontFamily: "Playfair Display",
      letterSpacing: -2,
      lineHeight: 1.05,
    },
    {
      id: "subtitle",
      type: "text",
      name: "Subtitle",
      parentId: null,
      x: 80,
      y: 430,
      width: 1040,
      height: 48,
      rotation: 0,
      opacity: 0.7,
      visible: true,
      locked: false,
      text: "A focused product blog.",
      fontSize: 32,
      fontWeight: 500,
      italic: false,
      color: { kind: "flat", color: "#ffffff" },
      align: "left",
      fontFamily: "Inter",
      letterSpacing: 0,
      lineHeight: 1.3,
    },
  ],
  paramsSchema: {},
};

export const AI_TEMPLATE_EXAMPLE_GRADIENT: TemplateDocument = {
  artboard: {
    width: 1200,
    height: 630,
    background: {
      kind: "linear",
      angle: 135,
      stops: [
        { color: "#0f172a", position: 0 },
        { color: "#6366f1", position: 1 },
      ],
    },
  },
  nodes: [
    {
      id: "blob",
      type: "ellipse",
      name: "Accent blob",
      parentId: null,
      x: 820,
      y: -120,
      width: 520,
      height: 520,
      rotation: 0,
      opacity: 0.55,
      visible: true,
      locked: false,
      fill: {
        kind: "radial",
        cx: 0.5,
        cy: 0.5,
        stops: [
          { color: "#22d3ee", position: 0 },
          { color: "#22d3ee", position: 1 },
        ],
      },
      stroke: { kind: "flat", color: "#000000" },
      strokeWidth: 0,
    },
    {
      id: "kicker",
      type: "text",
      name: "Kicker",
      parentId: null,
      x: 80,
      y: 140,
      width: 600,
      height: 40,
      rotation: 0,
      opacity: 0.8,
      visible: true,
      locked: false,
      text: "CHANGELOG / V2.1",
      fontSize: 22,
      fontWeight: 600,
      italic: false,
      color: { kind: "flat", color: "#a5b4fc" },
      align: "left",
      fontFamily: "JetBrains Mono",
      letterSpacing: 4,
      lineHeight: 1.2,
    },
    {
      id: "title",
      type: "text",
      name: "Title",
      parentId: null,
      x: 80,
      y: 200,
      width: 760,
      height: 240,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      text: "Faster renders, sharper diffs.",
      fontSize: 88,
      fontWeight: 700,
      italic: false,
      color: { kind: "flat", color: "#ffffff" },
      align: "left",
      fontFamily: "Space Grotesk",
      letterSpacing: -2,
      lineHeight: 1.05,
    },
    {
      id: "rule",
      type: "line",
      name: "Divider",
      parentId: null,
      x: 80,
      y: 480,
      width: 200,
      height: 0,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      stroke: { kind: "flat", color: "#a5b4fc" },
      strokeWidth: 3,
      arrow: false,
    },
    {
      id: "byline",
      type: "text",
      name: "Byline",
      parentId: null,
      x: 80,
      y: 510,
      width: 700,
      height: 36,
      rotation: 0,
      opacity: 0.7,
      visible: true,
      locked: false,
      text: "by the Waku team",
      fontSize: 26,
      fontWeight: 500,
      italic: false,
      color: { kind: "flat", color: "#e2e8f0" },
      align: "left",
      fontFamily: "Inter",
      letterSpacing: 0,
      lineHeight: 1.2,
    },
  ],
  paramsSchema: {},
};

export const AI_TEMPLATE_EXAMPLE_PARAMETERIZED: TemplateDocument = {
  artboard: {
    width: 1200,
    height: 630,
    background: { kind: "flat", color: "#ffffff" },
  },
  nodes: [
    {
      id: "cover",
      type: "image",
      name: "Cover",
      parentId: null,
      x: 0,
      y: 0,
      width: 1200,
      height: 360,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      src: {
        $param: "image",
        default:
          "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&q=80",
      },
      fit: "cover",
      cornerRadius: 0,
      stroke: { kind: "flat", color: "#000000" },
      strokeWidth: 0,
      shadow: null,
    },
    {
      id: "title",
      type: "text",
      name: "Title",
      parentId: null,
      x: 80,
      y: 410,
      width: 1040,
      height: 140,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      text: { $param: "title", default: "Your headline here" },
      fontSize: 80,
      fontWeight: 400,
      italic: false,
      color: {
        kind: "flat",
        color: { $param: "brand", default: "#111111" },
      },
      align: "left",
      fontFamily: "DM Serif Display",
      letterSpacing: -1.5,
      lineHeight: 1.1,
    },
  ],
  paramsSchema: {
    title: { kind: "string", default: "Your headline here", maxLen: 80 },
    image: {
      kind: "string",
      default:
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1600&q=80",
    },
    brand: { kind: "color", default: "#111111" },
  },
};

export const AI_TEMPLATE_EXAMPLES: TemplateDocument[] = [
  AI_TEMPLATE_EXAMPLE_MINIMAL,
  AI_TEMPLATE_EXAMPLE_GRADIENT,
  AI_TEMPLATE_EXAMPLE_PARAMETERIZED,
];
