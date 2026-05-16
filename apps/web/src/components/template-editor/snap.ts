import type { Artboard, EditorNode } from "./types";
import type { Guide } from "./store";

const SNAP_THRESHOLD = 6;

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AxisCandidate {
  position: number;
  fromCenter: boolean;
}

function collectAxis(
  others: EditorNode[],
  artboard: Artboard,
  axis: "x" | "y",
): AxisCandidate[] {
  const out: AxisCandidate[] = [];
  if (axis === "x") {
    out.push({ position: 0, fromCenter: false });
    out.push({ position: artboard.width, fromCenter: false });
    out.push({ position: artboard.width / 2, fromCenter: true });
    for (const n of others) {
      out.push({ position: n.x, fromCenter: false });
      out.push({ position: n.x + n.width, fromCenter: false });
      out.push({ position: n.x + n.width / 2, fromCenter: true });
    }
  } else {
    out.push({ position: 0, fromCenter: false });
    out.push({ position: artboard.height, fromCenter: false });
    out.push({ position: artboard.height / 2, fromCenter: true });
    for (const n of others) {
      out.push({ position: n.y, fromCenter: false });
      out.push({ position: n.y + n.height, fromCenter: false });
      out.push({ position: n.y + n.height / 2, fromCenter: true });
    }
  }
  return out;
}

interface SnapResult {
  x: number;
  y: number;
  guides: Guide[];
}

export function snapMove(
  bounds: Bounds,
  others: EditorNode[],
  artboard: Artboard,
): SnapResult {
  const xRefs = [
    bounds.x,
    bounds.x + bounds.width / 2,
    bounds.x + bounds.width,
  ];
  const yRefs = [
    bounds.y,
    bounds.y + bounds.height / 2,
    bounds.y + bounds.height,
  ];
  const xCandidates = collectAxis(others, artboard, "x");
  const yCandidates = collectAxis(others, artboard, "y");

  let bestX: { delta: number; guide: number } | null = null;
  for (const ref of xRefs) {
    for (const cand of xCandidates) {
      const d = cand.position - ref;
      if (Math.abs(d) <= SNAP_THRESHOLD) {
        if (!bestX || Math.abs(d) < Math.abs(bestX.delta)) {
          bestX = { delta: d, guide: cand.position };
        }
      }
    }
  }

  let bestY: { delta: number; guide: number } | null = null;
  for (const ref of yRefs) {
    for (const cand of yCandidates) {
      const d = cand.position - ref;
      if (Math.abs(d) <= SNAP_THRESHOLD) {
        if (!bestY || Math.abs(d) < Math.abs(bestY.delta)) {
          bestY = { delta: d, guide: cand.position };
        }
      }
    }
  }

  const guides: Guide[] = [];
  let x = bounds.x;
  let y = bounds.y;
  if (bestX) {
    x += bestX.delta;
    guides.push({ axis: "x", position: bestX.guide });
  }
  if (bestY) {
    y += bestY.delta;
    guides.push({ axis: "y", position: bestY.guide });
  }
  return { x, y, guides };
}

interface ResizeResult {
  x: number;
  y: number;
  width: number;
  height: number;
  guides: Guide[];
}

/**
 * Snap the moving edges of a resize against sibling/artboard edges. Only the
 * edges named in `edges` move; the opposite edge stays pinned, so width/height
 * absorb the snap delta.
 */
export function snapResize(
  bounds: Bounds,
  edges: { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean },
  others: EditorNode[],
  artboard: Artboard,
): ResizeResult {
  const xCandidates = collectAxis(others, artboard, "x").filter(
    (c) => !c.fromCenter,
  );
  const yCandidates = collectAxis(others, artboard, "y").filter(
    (c) => !c.fromCenter,
  );

  let { x, y, width, height } = bounds;
  const guides: Guide[] = [];

  const snapEdge = (value: number, cands: AxisCandidate[]) => {
    let best: { pos: number; delta: number } | null = null;
    for (const cand of cands) {
      const d = cand.position - value;
      if (Math.abs(d) <= SNAP_THRESHOLD) {
        if (!best || Math.abs(d) < Math.abs(best.delta)) {
          best = { pos: cand.position, delta: d };
        }
      }
    }
    return best;
  };

  if (edges.left) {
    const hit = snapEdge(x, xCandidates);
    if (hit) {
      width = x + width - hit.pos;
      x = hit.pos;
      guides.push({ axis: "x", position: hit.pos });
    }
  } else if (edges.right) {
    const hit = snapEdge(x + width, xCandidates);
    if (hit) {
      width = hit.pos - x;
      guides.push({ axis: "x", position: hit.pos });
    }
  }

  if (edges.top) {
    const hit = snapEdge(y, yCandidates);
    if (hit) {
      height = y + height - hit.pos;
      y = hit.pos;
      guides.push({ axis: "y", position: hit.pos });
    }
  } else if (edges.bottom) {
    const hit = snapEdge(y + height, yCandidates);
    if (hit) {
      height = hit.pos - y;
      guides.push({ axis: "y", position: hit.pos });
    }
  }

  return { x, y, width, height, guides };
}
