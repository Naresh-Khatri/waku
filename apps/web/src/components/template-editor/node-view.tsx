"use client";

import type { EditorNode } from "./types";
import { resolveValue } from "./types";
import {
  EllipseSvg,
  LineSvg,
  RectangleSvg,
  StarSvg,
  TriangleSvg,
} from "./shape-svg";

export function NodeContent({
  node,
  draft,
}: {
  node: EditorNode;
  draft: Record<string, unknown>;
}) {
  switch (node.type) {
    case "image": {
      const src = resolveValue(node.src, draft) ?? "";
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          draggable={false}
          className="h-full w-full"
          style={{ objectFit: node.fit, pointerEvents: "none" }}
        />
      );
    }
    case "text": {
      const text = resolveValue(node.text, draft) ?? "";
      const color = resolveValue(node.color, draft) ?? "#000";
      return (
        <div
          className="h-full w-full"
          style={{
            fontFamily: node.fontFamily,
            fontSize: node.fontSize,
            fontWeight: node.fontWeight,
            fontStyle: node.italic ? "italic" : "normal",
            color,
            textAlign: node.align,
            letterSpacing: node.letterSpacing,
            lineHeight: node.lineHeight,
            display: "flex",
            alignItems: "center",
            justifyContent:
              node.align === "center"
                ? "center"
                : node.align === "right"
                  ? "flex-end"
                  : "flex-start",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            pointerEvents: "none",
          }}
        >
          {text}
        </div>
      );
    }
    case "rectangle":
      return <RectangleSvg node={node} draft={draft} />;
    case "ellipse":
      return <EllipseSvg node={node} draft={draft} />;
    case "triangle":
      return <TriangleSvg node={node} draft={draft} />;
    case "star":
      return <StarSvg node={node} draft={draft} />;
    case "line":
      return <LineSvg node={node} draft={draft} />;
  }
}
