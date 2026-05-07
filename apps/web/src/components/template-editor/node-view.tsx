"use client";

import type { EditorNode } from "./types";
import {
  EllipseSvg,
  LineSvg,
  RectangleSvg,
  StarSvg,
  TriangleSvg,
} from "./shape-svg";

export function NodeContent({ node }: { node: EditorNode }) {
  switch (node.type) {
    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={node.src}
          alt=""
          draggable={false}
          className="h-full w-full"
          style={{ objectFit: node.fit, pointerEvents: "none" }}
        />
      );
    case "text":
      return (
        <div
          className="h-full w-full"
          style={{
            fontFamily: node.fontFamily,
            fontSize: node.fontSize,
            fontWeight: node.fontWeight,
            fontStyle: node.italic ? "italic" : "normal",
            color: node.color,
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
          {node.text}
        </div>
      );
    case "rectangle":
      return <RectangleSvg node={node} />;
    case "ellipse":
      return <EllipseSvg node={node} />;
    case "triangle":
      return <TriangleSvg node={node} />;
    case "star":
      return <StarSvg node={node} />;
    case "line":
      return <LineSvg node={node} />;
  }
}
