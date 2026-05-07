import type { TemplateDocument } from "@/components/template-editor/types";

export function TemplatePreview({ document }: { document: TemplateDocument }) {
  const { artboard, nodes } = document;
  const bg =
    typeof artboard.background === "string" ? artboard.background : "#ffffff";
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: `${artboard.width} / ${artboard.height}` }}
    >
      <svg
        viewBox={`0 0 ${artboard.width} ${artboard.height}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        style={{ background: bg }}
      >
        {nodes.map((n) => {
          if (!n.visible) return null;
          if (n.type === "rectangle") {
            const fill = typeof n.fill === "string" ? n.fill : "#cccccc";
            return (
              <rect
                key={n.id}
                x={n.x}
                y={n.y}
                width={n.width}
                height={n.height}
                rx={n.cornerRadius}
                ry={n.cornerRadius}
                fill={fill}
                opacity={n.opacity}
              />
            );
          }
          if (n.type === "ellipse") {
            const fill = typeof n.fill === "string" ? n.fill : "#cccccc";
            return (
              <ellipse
                key={n.id}
                cx={n.x + n.width / 2}
                cy={n.y + n.height / 2}
                rx={n.width / 2}
                ry={n.height / 2}
                fill={fill}
                opacity={n.opacity}
              />
            );
          }
          if (n.type === "text") {
            const text =
              typeof n.text === "string" ? n.text : (n.text.default ?? "");
            const color = typeof n.color === "string" ? n.color : "#000000";
            const anchor =
              n.align === "center"
                ? "middle"
                : n.align === "right"
                  ? "end"
                  : "start";
            const tx =
              n.align === "center"
                ? n.x + n.width / 2
                : n.align === "right"
                  ? n.x + n.width
                  : n.x;
            return (
              <text
                key={n.id}
                x={tx}
                y={n.y + n.fontSize}
                fontSize={n.fontSize}
                fontWeight={n.fontWeight}
                fontStyle={n.italic ? "italic" : "normal"}
                fill={color}
                textAnchor={anchor}
                fontFamily="Inter, sans-serif"
                letterSpacing={n.letterSpacing}
                opacity={n.opacity}
              >
                {text}
              </text>
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
}
