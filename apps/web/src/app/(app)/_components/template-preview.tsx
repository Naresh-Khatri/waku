"use client";

import type { CSSProperties } from "react";

import { NodeContent } from "@/components/template-editor/node-view";
import type { TemplateDocument } from "@/components/template-editor/types";
import {
  paintToCss,
  paramsWithDefaults,
  resolveValue,
} from "@/components/template-editor/types";

// One renderer to rule them all: cards, editor canvas, and exports must agree.
// We piggy-back on the editor's <NodeContent> via <foreignObject> so every node
// kind (shapes, text, images, gradient paint, shadows, rotation, params) lands
// here automatically — no parallel SVG re-implementation to drift.
export function TemplatePreview({
  document,
  values,
}: {
  document: TemplateDocument;
  values?: Record<string, unknown>;
}) {
  const { artboard, nodes, paramsSchema } = document;
  const draft = paramsWithDefaults(values ?? {}, paramsSchema);
  const bg = paintToCss(artboard.background, draft);

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ aspectRatio: `${artboard.width} / ${artboard.height}` }}
    >
      <svg
        viewBox={`0 0 ${artboard.width} ${artboard.height}`}
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        style={{ background: bg }}
      >
        <foreignObject
          x={0}
          y={0}
          width={artboard.width}
          height={artboard.height}
        >
          <div
            style={{
              position: "relative",
              width: artboard.width,
              height: artboard.height,
            }}
          >
            {nodes.map((node) => {
              if (!node.visible) return null;
              const opacity = resolveValue(node.opacity, draft) ?? 1;
              const style: CSSProperties = {
                position: "absolute",
                left: node.x,
                top: node.y,
                width: node.width,
                height: node.height,
                opacity,
                transform: node.rotation
                  ? `rotate(${node.rotation}deg)`
                  : undefined,
                transformOrigin: "center center",
                pointerEvents: "none",
              };
              return (
                <div key={node.id} style={style}>
                  <NodeContent node={node} draft={draft} />
                </div>
              );
            })}
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}
