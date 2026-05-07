import type { Fill, Gradient, Node, ParamRef, Value } from "@waku/ir";
import { isParamRef } from "@waku/ir";

export type DraftValues = Record<string, unknown>;

const PLACEHOLDER_COLOR = "#888888";
const PLACEHOLDER_FILL = "#88888833";
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%201%201%27%2F%3E";

const stringPlaceholder = (name: string) => `[${name}]`;

const resolveValue = <T>(
  v: Value<T> | undefined,
  values: DraftValues,
  fallback: (ref: ParamRef<T>) => T,
): T | undefined => {
  if (v === undefined) return undefined;
  if (isParamRef(v)) {
    const ref = v as ParamRef<T>;
    const fromValues = values[ref.$param];
    if (fromValues !== undefined) return fromValues as T;
    if (ref.default !== undefined) return ref.default;
    return fallback(ref);
  }
  return v as T;
};

const resolveFill = (f: Fill | undefined, values: DraftValues): string | Gradient | undefined => {
  if (f === undefined) return undefined;
  if (isParamRef(f)) {
    const ref = f as ParamRef<string>;
    const v = values[ref.$param] ?? ref.default;
    return (v as string | undefined) ?? PLACEHOLDER_FILL;
  }
  return f;
};

export const resolveForEditor = (root: Node, values: DraftValues): Node => {
  switch (root.type) {
    case "frame":
      return {
        ...root,
        bg: resolveFill(root.bg, values),
        children: root.children?.map((c) => resolveForEditor(c, values)),
      };
    case "stack":
      return {
        ...root,
        bg: resolveFill(root.bg, values),
        children: root.children?.map((c) => resolveForEditor(c, values)),
      };
    case "text": {
      const value = resolveValue(root.value, values, (ref) => stringPlaceholder(ref.$param));
      const color = resolveValue(root.color, values, () => PLACEHOLDER_COLOR);
      return { ...root, value: value ?? "", color: color ?? PLACEHOLDER_COLOR };
    }
    case "image": {
      const src = resolveValue(root.src, values, () => PLACEHOLDER_IMAGE);
      return { ...root, src: src ?? PLACEHOLDER_IMAGE };
    }
    case "shape":
      return { ...root, fill: resolveFill(root.fill, values) };
    case "gradient":
      return root;
  }
};
