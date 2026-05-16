import type { EditorNode, NodeType, Paint, ParamKind } from "./types";
import { isFlatPaint, isParamRef } from "./types";

export interface BindingField {
  /** Field name on the node — passed to `bindToParam`/`unbind`. */
  field: string;
  /** Human label shown in the bindings list. */
  label: string;
  /** Param kind compatible with this field. */
  kind: ParamKind;
  /** True for `Paint`-typed fields (fill, stroke, text color). */
  paint?: boolean;
}

/**
 * Per-NodeType list of bindable fields, in display order. Used by the
 * node-scoped Variables popover surfaced from the floating toolbar.
 */
export const NODE_BINDINGS: Record<NodeType, BindingField[]> = {
  text: [
    { field: "text", label: "Text", kind: "string" },
    { field: "color", label: "Color", kind: "color", paint: true },
  ],
  image: [
    { field: "src", label: "Image source", kind: "string" },
    { field: "stroke", label: "Stroke", kind: "color", paint: true },
  ],
  rectangle: [
    { field: "fill", label: "Fill", kind: "color", paint: true },
    { field: "stroke", label: "Stroke", kind: "color", paint: true },
  ],
  ellipse: [
    { field: "fill", label: "Fill", kind: "color", paint: true },
    { field: "stroke", label: "Stroke", kind: "color", paint: true },
  ],
  triangle: [
    { field: "fill", label: "Fill", kind: "color", paint: true },
    { field: "stroke", label: "Stroke", kind: "color", paint: true },
  ],
  star: [
    { field: "fill", label: "Fill", kind: "color", paint: true },
    { field: "stroke", label: "Stroke", kind: "color", paint: true },
  ],
  path: [
    { field: "d", label: "Path data", kind: "string" },
    { field: "fill", label: "Fill", kind: "color", paint: true },
    { field: "stroke", label: "Stroke", kind: "color", paint: true },
  ],
  line: [
    { field: "stroke", label: "Color", kind: "color", paint: true },
  ],
};

/**
 * Names of the params a node's bindable fields are currently bound to, in
 * field display order. A field counts as bound when its value is a
 * `ParamRef`, or — for paint fields — when it's a flat paint whose color is
 * a `ParamRef`. Used to surface a binding indicator on the canvas.
 */
export function nodeBoundParams(node: EditorNode): string[] {
  const fields = NODE_BINDINGS[node.type] ?? [];
  const names: string[] = [];
  for (const f of fields) {
    const raw = (node as unknown as Record<string, unknown>)[f.field];
    if (raw == null) continue;
    const inner = f.paint
      ? isFlatPaint(raw as Paint)
        ? (raw as { color: unknown }).color
        : null
      : raw;
    if (inner != null && isParamRef(inner)) {
      names.push((inner as { $param: string }).$param);
    }
  }
  return names;
}

const FLAT_BLACK: Paint = { kind: "flat", color: "#000000" };

/**
 * Kind-default fallback used when unbinding a variable. Picker code can
 * override with a more context-specific fallback if it has one.
 */
export function fallbackForKind(kind: ParamKind, paint?: boolean): unknown {
  if (paint) return FLAT_BLACK;
  return kind === "color" ? "#000000" : "";
}
