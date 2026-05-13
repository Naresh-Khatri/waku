import type { TemplateDocument } from "@/components/template-editor/types";
import { resolveValue } from "@/components/template-editor/types";

const num = (v: unknown, fallback: number): number => {
  const r = resolveValue(v as never, {});
  return typeof r === "number" ? r : fallback;
};

const bool = (v: unknown, fallback: boolean): boolean => {
  const r = resolveValue(v as never, {});
  return typeof r === "boolean" ? r : fallback;
};

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
          const opacity = num(n.opacity, 1);
          if (n.type === "rectangle") {
            const fill = typeof n.fill === "string" ? n.fill : "#cccccc";
            const cr = num(n.cornerRadius, 0);
            return (
              <rect
                key={n.id}
                x={n.x}
                y={n.y}
                width={n.width}
                height={n.height}
                rx={cr}
                ry={cr}
                fill={fill}
                opacity={opacity}
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
                opacity={opacity}
              />
            );
          }
          if (n.type === "text") {
            const text =
              typeof n.text === "string" ? n.text : (n.text.default ?? "");
            const color = typeof n.color === "string" ? n.color : "#000000";
            const fontSize = num(n.fontSize, 16);
            const letterSpacing = num(n.letterSpacing, 0);
            const italic = bool(n.italic, false);
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
                y={n.y + fontSize}
                fontSize={fontSize}
                fontWeight={n.fontWeight}
                fontStyle={italic ? "italic" : "normal"}
                fill={color}
                textAnchor={anchor}
                fontFamily="Inter, sans-serif"
                letterSpacing={letterSpacing}
                opacity={opacity}
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
