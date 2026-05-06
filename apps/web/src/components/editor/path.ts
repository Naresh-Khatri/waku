import type { Node } from "@waku/ir";

import { ROOT_ID } from "./IRRenderer";

/**
 * Path-based addressing for IR nodes. The root is "0"; children use
 * "{parent}.children.{idx}". Stable across re-renders for a given tree
 * shape; recompute selection when shape changes (insert/delete).
 */

export type NodePath = string;

const segments = (path: NodePath): number[] => {
  if (path === ROOT_ID) return [];
  const parts = path.split(".");
  if (parts[0] !== ROOT_ID) throw new Error(`bad path: ${path}`);
  const out: number[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    if (parts[i] !== "children") throw new Error(`bad path: ${path}`);
    const idx = Number(parts[i + 1]);
    if (!Number.isInteger(idx) || idx < 0) {
      throw new Error(`bad path: ${path}`);
    }
    out.push(idx);
  }
  return out;
};

const childrenOf = (n: Node): Node[] | undefined => {
  if (n.type === "frame" || n.type === "stack") return n.children;
  return undefined;
};

const withChildren = (n: Node, children: Node[]): Node => {
  if (n.type !== "frame" && n.type !== "stack") {
    throw new Error(`${n.type} cannot have children`);
  }
  return { ...n, children };
};

export const parentPath = (path: NodePath): NodePath | null => {
  if (path === ROOT_ID) return null;
  const parts = path.split(".");
  return parts.slice(0, -2).join(".");
};

export const lastIndex = (path: NodePath): number => {
  if (path === ROOT_ID) return -1;
  const parts = path.split(".");
  const idx = Number(parts[parts.length - 1]);
  if (!Number.isInteger(idx)) throw new Error(`bad path: ${path}`);
  return idx;
};

export const getNodeAt = (root: Node, path: NodePath): Node | null => {
  let current: Node | null = root;
  for (const idx of segments(path)) {
    if (current === null) return null;
    const ch: Node[] | undefined = childrenOf(current);
    const child = ch?.[idx];
    if (!child) return null;
    current = child;
  }
  return current;
};

export const replaceNodeAt = (
  root: Node,
  path: NodePath,
  next: Node,
): Node => {
  const segs = segments(path);
  if (segs.length === 0) return next;
  const recur = (node: Node, depth: number): Node => {
    const idx = segs[depth];
    if (idx === undefined) return next;
    const ch = childrenOf(node);
    if (!ch) throw new Error(`path traverses ${node.type} which has no children`);
    const child = ch[idx];
    if (!child) throw new Error(`missing child at ${path}`);
    const newChildren = ch.slice();
    newChildren[idx] = recur(child, depth + 1);
    return withChildren(node, newChildren);
  };
  return recur(root, 0);
};

export const removeNodeAt = (root: Node, path: NodePath): Node => {
  const segs = segments(path);
  if (segs.length === 0) {
    throw new Error("cannot remove root node");
  }
  const recur = (node: Node, depth: number): Node => {
    const idx = segs[depth];
    if (idx === undefined) return node;
    const ch = childrenOf(node);
    if (!ch) throw new Error(`path traverses ${node.type} which has no children`);
    if (depth === segs.length - 1) {
      return withChildren(node, ch.filter((_, i) => i !== idx));
    }
    const child = ch[idx];
    if (!child) throw new Error(`missing child at ${path}`);
    const newChildren = ch.slice();
    newChildren[idx] = recur(child, depth + 1);
    return withChildren(node, newChildren);
  };
  return recur(root, 0);
};

export const insertChildAt = (
  root: Node,
  parentPath: NodePath,
  index: number,
  child: Node,
): Node => {
  const target = getNodeAt(root, parentPath);
  if (!target) throw new Error(`no node at ${parentPath}`);
  const ch = childrenOf(target) ?? [];
  const next = ch.slice();
  next.splice(Math.max(0, Math.min(index, next.length)), 0, child);
  return replaceNodeAt(root, parentPath, withChildren(target, next));
};
