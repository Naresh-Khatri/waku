"use client";

import type { CSSProperties } from "react";
import type { EditorNode, Paint, Shadow } from "./types";
import { isFlatPaint, paintToCss, resolveValue } from "./types";

function shadowCss(
  shadow: Shadow,
  draft: Record<string, unknown>,
): string {
  const color = resolveValue(shadow.color, draft) ?? "#00000040";
  return `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${color}`;
}

function paintColorStyle(
  paint: Paint,
  draft: Record<string, unknown>,
): CSSProperties {
  const css = paintToCss(paint, draft);
  return isFlatPaint(paint)
    ? { color: css }
    : {
        color: "transparent",
        backgroundImage: css,
        backgroundClip: "text",
        WebkitBackgroundClip: "text",
      };
}

import {
  EllipseSvg,
  LineSvg,
  PathSvg,
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
      const cornerRadius = Math.max(
        0,
        resolveValue(node.cornerRadius, draft) ?? 0,
      );
      const sw = Math.max(0, resolveValue(node.strokeWidth, draft) ?? 0);
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
        imgStyle.boxShadow = shadowCss(node.shadow, draft);
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
      const fontSize = Math.max(1, resolveValue(node.fontSize, draft) ?? 16);
      const italic = resolveValue(node.italic, draft) ?? false;
      const letterSpacing = resolveValue(node.letterSpacing, draft) ?? 0;
      const lineHeight = Math.max(
        0.1,
        resolveValue(node.lineHeight, draft) ?? 1.2,
      );
      const baseColorStyle = paintColorStyle(node.color, draft);
      const containerStyle: CSSProperties = {
        fontFamily: node.fontFamily,
        fontSize,
        fontWeight: node.fontWeight,
        fontStyle: italic ? "italic" : "normal",
        ...baseColorStyle,
        textAlign: node.align,
        letterSpacing,
        lineHeight,
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
        ...(node.shadow ? { textShadow: shadowCss(node.shadow, draft) } : {}),
      };
      return (
        <div className="h-full w-full" style={containerStyle}>
          {resolveValue(node.text, draft) ?? ""}
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
    case "path":
      return <PathSvg node={node} draft={draft} />;
  }
}
