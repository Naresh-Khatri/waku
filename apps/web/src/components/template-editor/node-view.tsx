"use client";

import type { CSSProperties } from "react";
import type { EditorNode } from "./types";
import { isFlatPaint, paintToCss, resolveValue } from "./types";
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
      const cornerRadius = node.cornerRadius;
      const sw = node.strokeWidth;
      const strokeIsFlat = isFlatPaint(node.stroke);
      const strokeCss = paintToCss(node.stroke, draft);

      const imgStyle: CSSProperties = {
        objectFit: node.fit,
        pointerEvents: "none",
      };
      if (cornerRadius > 0) imgStyle.borderRadius = cornerRadius;

      // Flat stroke: CSS border on the image. Gradient stroke: padding-wrapper.
      if (sw > 0 && strokeIsFlat) {
        imgStyle.border = `${sw}px solid ${strokeCss}`;
        imgStyle.boxSizing = "border-box";
      }
      if (node.shadow) {
        const shadowColor =
          resolveValue(node.shadow.color, draft) ?? "#00000040";
        imgStyle.boxShadow = `${node.shadow.offsetX}px ${node.shadow.offsetY}px ${node.shadow.blur}px ${shadowColor}`;
      }

      const img = (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          draggable={false}
          className="h-full w-full"
          style={imgStyle}
        />
      );

      if (sw > 0 && !strokeIsFlat) {
        const innerR = Math.max(0, cornerRadius - sw);
        const wrapStyle: CSSProperties = {
          width: "100%",
          height: "100%",
          padding: sw,
          boxSizing: "border-box",
          background: strokeCss,
          borderRadius: cornerRadius,
        };
        const innerImgStyle: CSSProperties = {
          ...imgStyle,
          width: "100%",
          height: "100%",
          borderRadius: innerR,
          border: undefined,
        };
        return (
          <div style={wrapStyle}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              draggable={false}
              style={innerImgStyle}
            />
          </div>
        );
      }
      return img;
    }
    case "text": {
      const text = resolveValue(node.text, draft) ?? "";
      const colorCss = paintToCss(node.color, draft);
      const isFlat = isFlatPaint(node.color);
      const colorStyle: CSSProperties = isFlat
        ? { color: colorCss }
        : {
            color: "transparent",
            backgroundImage: colorCss,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
          };
      return (
        <div
          className="h-full w-full"
          style={{
            fontFamily: node.fontFamily,
            fontSize: node.fontSize,
            fontWeight: node.fontWeight,
            fontStyle: node.italic ? "italic" : "normal",
            ...colorStyle,
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
