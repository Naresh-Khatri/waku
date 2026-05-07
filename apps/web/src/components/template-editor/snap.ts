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
