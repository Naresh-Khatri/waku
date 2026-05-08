import type {
  EllipseNode,
  LineNode,
  RectangleNode,
  StarNode,
  TriangleNode,
} from "./types";
import { paintToSvgPaint, resolveValue } from "./types";

type Draft = Record<string, unknown>;

function svgPaint(
  paint: Parameters<typeof paintToSvgPaint>[0],
  id: string,
  draft: Draft,
) {
  return paintToSvgPaint(paint, id, draft);
}

export function RectangleSvg({ node, draft }: { node: RectangleNode; draft: Draft }) {
  const sw = Math.max(0, resolveValue(node.strokeWidth, draft) ?? 0);
  const cr = Math.max(0, resolveValue(node.cornerRadius, draft) ?? 0);
  const r = Math.min(cr, node.width / 2, node.height / 2);
  const fill = svgPaint(node.fill, `rect-fill-${node.id}`, draft);
  const stroke = svgPaint(node.stroke, `rect-stroke-${node.id}`, draft);
  return (
    <svg
      width={node.width}
      height={node.height}
      viewBox={`0 0 ${node.width} ${node.height}`}
      className="block"
    >
      <Defs defs={[fill.def, stroke.def]} />
      <rect
        x={sw / 2}
        y={sw / 2}
        width={Math.max(0, node.width - sw)}
        height={Math.max(0, node.height - sw)}
        rx={r}
        ry={r}
        fill={fill.ref}
        stroke={sw > 0 ? stroke.ref : "none"}
        strokeWidth={sw}
      />
    </svg>
  );
}

export function EllipseSvg({ node, draft }: { node: EllipseNode; draft: Draft }) {
  const sw = Math.max(0, resolveValue(node.strokeWidth, draft) ?? 0);
  const fill = svgPaint(node.fill, `ell-fill-${node.id}`, draft);
  const stroke = svgPaint(node.stroke, `ell-stroke-${node.id}`, draft);
  return (
    <svg
      width={node.width}
      height={node.height}
      viewBox={`0 0 ${node.width} ${node.height}`}
      className="block"
    >
      <Defs defs={[fill.def, stroke.def]} />
      <ellipse
        cx={node.width / 2}
        cy={node.height / 2}
        rx={Math.max(0, node.width / 2 - sw / 2)}
        ry={Math.max(0, node.height / 2 - sw / 2)}
        fill={fill.ref}
        stroke={sw > 0 ? stroke.ref : "none"}
        strokeWidth={sw}
      />
    </svg>
  );
}

export function TriangleSvg({ node, draft }: { node: TriangleNode; draft: Draft }) {
  const sw = Math.max(0, resolveValue(node.strokeWidth, draft) ?? 0);
  const w = node.width;
  const h = node.height;
  const points = `${w / 2},${sw / 2} ${w - sw / 2},${h - sw / 2} ${sw / 2},${h - sw / 2}`;
  const fill = svgPaint(node.fill, `tri-fill-${node.id}`, draft);
  const stroke = svgPaint(node.stroke, `tri-stroke-${node.id}`, draft);
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="block"
    >
      <Defs defs={[fill.def, stroke.def]} />
      <polygon
        points={points}
        fill={fill.ref}
        stroke={sw > 0 ? stroke.ref : "none"}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarSvg({ node, draft }: { node: StarNode; draft: Draft }) {
  const sw = Math.max(0, resolveValue(node.strokeWidth, draft) ?? 0);
  const points = Math.max(
    3,
    Math.round(resolveValue(node.points, draft) ?? 5),
  );
  const ratio = Math.min(
    1,
    Math.max(0, resolveValue(node.innerRadiusRatio, draft) ?? 0.5),
  );
  const cx = node.width / 2;
  const cy = node.height / 2;
  const outerX = (node.width - sw) / 2;
  const outerY = (node.height - sw) / 2;
  const innerX = outerX * ratio;
  const innerY = outerY * ratio;
  const total = points * 2;
  const pts: string[] = [];
  for (let i = 0; i < total; i++) {
    const angle = (Math.PI * i) / points - Math.PI / 2;
    const rx = i % 2 === 0 ? outerX : innerX;
    const ry = i % 2 === 0 ? outerY : innerY;
    pts.push(`${cx + Math.cos(angle) * rx},${cy + Math.sin(angle) * ry}`);
  }
  const fill = svgPaint(node.fill, `star-fill-${node.id}`, draft);
  const stroke = svgPaint(node.stroke, `star-stroke-${node.id}`, draft);
  return (
    <svg
      width={node.width}
      height={node.height}
      viewBox={`0 0 ${node.width} ${node.height}`}
      className="block"
    >
      <Defs defs={[fill.def, stroke.def]} />
      <polygon
        points={pts.join(" ")}
        fill={fill.ref}
        stroke={sw > 0 ? stroke.ref : "none"}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LineSvg({ node, draft }: { node: LineNode; draft: Draft }) {
  const w = Math.max(node.width, 1);
  const h = Math.max(node.height, 1);
  const cy = h / 2;
  const sw = Math.max(0, resolveValue(node.strokeWidth, draft) ?? 0);
  const arrow = resolveValue(node.arrow, draft) ?? false;
  const arrowSize = sw * 3;
  const endX = arrow ? Math.max(0, w - arrowSize) : w;
  const stroke = svgPaint(node.stroke, `line-stroke-${node.id}`, draft);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
      <Defs defs={[stroke.def]} />
      <line
        x1={0}
        y1={cy}
        x2={endX}
        y2={cy}
        stroke={stroke.ref}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      {arrow ? (
        <polygon
          points={`${w},${cy} ${endX},${cy - arrowSize / 2} ${endX},${cy + arrowSize / 2}`}
          fill={stroke.ref}
        />
      ) : null}
    </svg>
  );
}

function Defs({ defs }: { defs: string[] }) {
  const filtered = defs.filter((d) => d.length > 0);
  if (filtered.length === 0) return null;
  return <defs dangerouslySetInnerHTML={{ __html: filtered.join("") }} />;
}
