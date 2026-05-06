/**
 * Walk an IR tree and replace every {$param} reference with the concrete
 * value from `values` (or its default).
 *
 * Pure: returns a new tree, does not mutate input.
 */

import type {
  Fill,
  Gradient,
  Node,
  ParamRef,
  Value,
} from "./types";
import { isParamRef } from "./types";

export type ResolvedValues = Record<string, unknown>;

export class ParamResolutionError extends Error {
  constructor(public readonly paramName: string, message: string) {
    super(message);
    this.name = "ParamResolutionError";
  }
}

const resolveValue = <T>(v: Value<T> | undefined, values: ResolvedValues): T | undefined => {
  if (v === undefined) return undefined;
  if (isParamRef(v)) {
    const ref = v as ParamRef<T>;
    const fromValues = values[ref.$param];
    if (fromValues !== undefined) return fromValues as T;
    if (ref.default !== undefined) return ref.default;
    throw new ParamResolutionError(
      ref.$param,
      `Required param '${ref.$param}' was not provided and has no default`,
    );
  }
  return v as T;
};

const resolveFill = (f: Fill | undefined, values: ResolvedValues): Exclude<Fill, ParamRef<string>> | undefined => {
  if (f === undefined) return undefined;
  if (isParamRef(f)) {
    const ref = f as ParamRef<string>;
    const v = values[ref.$param] ?? ref.default;
    if (v === undefined) {
      throw new ParamResolutionError(
        ref.$param,
        `Required param '${ref.$param}' (fill) was not provided and has no default`,
      );
    }
    return v as string;
  }
  return f as string | Gradient;
};

export const resolve = (root: Node, values: ResolvedValues): Node => {
  switch (root.type) {
    case "frame": {
      return {
        ...root,
        bg: resolveFill(root.bg, values),
        children: root.children?.map((c) => resolve(c, values)),
      };
    }
    case "stack": {
      return {
        ...root,
        bg: resolveFill(root.bg, values),
        children: root.children?.map((c) => resolve(c, values)),
      };
    }
    case "text": {
      const value = resolveValue(root.value, values);
      const color = resolveValue(root.color, values);
      if (value === undefined) {
        throw new ParamResolutionError("(text.value)", "text node value resolved to undefined");
      }
      if (color === undefined) {
        throw new ParamResolutionError("(text.color)", "text node color resolved to undefined");
      }
      return { ...root, value, color };
    }
    case "image": {
      const src = resolveValue(root.src, values);
      if (src === undefined) {
        throw new ParamResolutionError("(image.src)", "image node src resolved to undefined");
      }
      return { ...root, src };
    }
    case "shape": {
      return { ...root, fill: resolveFill(root.fill, values) };
    }
    case "gradient": {
      return root;
    }
  }
};

/**
 * Collect every param name referenced anywhere in the tree.
 * Useful for validating that an IR's referenced params match its
 * declared schema.
 */
export const collectParams = (root: Node): Set<string> => {
  const out = new Set<string>();
  const visitValue = (v: unknown) => {
    if (isParamRef(v)) out.add(v.$param);
  };
  const walk = (n: Node) => {
    switch (n.type) {
      case "frame":
        visitValue(n.bg);
        n.children?.forEach(walk);
        return;
      case "stack":
        visitValue(n.bg);
        n.children?.forEach(walk);
        return;
      case "text":
        visitValue(n.value);
        visitValue(n.color);
        return;
      case "image":
        visitValue(n.src);
        return;
      case "shape":
        visitValue(n.fill);
        return;
      case "gradient":
        return;
    }
  };
  walk(root);
  return out;
};
