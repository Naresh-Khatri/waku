import type {
  EllipseNode,
  LineNode,
  RectangleNode,
  StarNode,
  TriangleNode,
} from "./types";

export function RectangleSvg({ node }: { node: RectangleNode }) {
  const sw = node.strokeWidth;
  const r = Math.min(node.cornerRadius, node.width / 2, node.height / 2);
  return (
    <svg
      width={node.width}
      height={node.height}
      viewBox={`0 0 ${node.width} ${node.height}`}
      className="block"
    >
      <rect
        x={sw / 2}
        y={sw / 2}
        width={Math.max(0, node.width - sw)}
        height={Math.max(0, node.height - sw)}
        rx={r}
        ry={r}
        fill={node.fill}
        stroke={sw > 0 ? node.stroke : "none"}
        strokeWidth={sw}
      />
    </svg>
  );
}

export function EllipseSvg({ node }: { node: EllipseNode }) {
  const sw = node.strokeWidth;
  return (
    <svg
      width={node.width}
      height={node.height}
      viewBox={`0 0 ${node.width} ${node.height}`}
      className="block"
    >
      <ellipse
        cx={node.width / 2}
        cy={node.height / 2}
        rx={Math.max(0, node.width / 2 - sw / 2)}
        ry={Math.max(0, node.height / 2 - sw / 2)}
        fill={node.fill}
        stroke={sw > 0 ? node.stroke : "none"}
        strokeWidth={sw}
      />
    </svg>
  );
}

export function TriangleSvg({ node }: { node: TriangleNode }) {
  const sw = node.strokeWidth;
  const w = node.width;
  const h = node.height;
  const points = `${w / 2},${sw / 2} ${w - sw / 2},${h - sw / 2} ${sw / 2},${h - sw / 2}`;
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="block"
    >
      <polygon
        points={points}
        fill={node.fill}
        stroke={sw > 0 ? node.stroke : "none"}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarSvg({ node }: { node: StarNode }) {
  const sw = node.strokeWidth;
  const cx = node.width / 2;
  const cy = node.height / 2;
  const outerX = (node.width - sw) / 2;
  const outerY = (node.height - sw) / 2;
  const innerX = outerX * node.innerRadiusRatio;
  const innerY = outerY * node.innerRadiusRatio;
  const total = node.points * 2;
  const pts: string[] = [];
  for (let i = 0; i < total; i++) {
    const angle = (Math.PI * i) / node.points - Math.PI / 2;
    const rx = i % 2 === 0 ? outerX : innerX;
    const ry = i % 2 === 0 ? outerY : innerY;
    pts.push(`${cx + Math.cos(angle) * rx},${cy + Math.sin(angle) * ry}`);
  }
  return (
    <svg
      width={node.width}
      height={node.height}
      viewBox={`0 0 ${node.width} ${node.height}`}
      className="block"
    >
      <polygon
        points={pts.join(" ")}
        fill={node.fill}
        stroke={sw > 0 ? node.stroke : "none"}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LineSvg({ node }: { node: LineNode }) {
  const w = Math.max(node.width, 1);
  const h = Math.max(node.height, 1);
  const cy = h / 2;
  const arrowSize = node.strokeWidth * 3;
  const endX = node.arrow ? Math.max(0, w - arrowSize) : w;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block">
      <line
        x1={0}
        y1={cy}
        x2={endX}
        y2={cy}
        stroke={node.stroke}
        strokeWidth={node.strokeWidth}
        strokeLinecap="round"
      />
      {node.arrow ? (
        <polygon
          points={`${w},${cy} ${endX},${cy - arrowSize / 2} ${endX},${cy + arrowSize / 2}`}
          fill={node.stroke}
        />
      ) : null}
    </svg>
  );
}
