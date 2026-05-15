"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type CSSProperties,
} from "react";
import type { EditorNode, Paint, Shadow } from "./types";
import { isFlatPaint, paintToCss, resolveValue } from "./types";

function shadowCss(shadow: Shadow, draft: Record<string, unknown>): string {
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
  editing = false,
  caretPoint = null,
  onCommitText,
  onExitEditing,
}: {
  node: EditorNode;
  draft: Record<string, unknown>;
  editing?: boolean;
  caretPoint?: { x: number; y: number } | null;
  onCommitText?: (text: string) => void;
  onExitEditing?: () => void;
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
            <img src={src} alt="" draggable={false} style={innerImgStyle} />
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
      const text = resolveValue(node.text, draft) ?? "";
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
        overflow: "hidden",
        ...(node.shadow ? { textShadow: shadowCss(node.shadow, draft) } : {}),
      };
      if (editing) {
        return (
          <EditableText
            initialText={typeof text === "string" ? text : String(text)}
            initialCaret={caretPoint}
            containerStyle={containerStyle}
            onCommit={(next) => onCommitText?.(next)}
            onExit={() => onExitEditing?.()}
          />
        );
      }
      return (
        <div className="h-full w-full" style={containerStyle}>
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
    case "path":
      return <PathSvg node={node} draft={draft} />;
  }
}

function EditableText({
  initialText,
  initialCaret,
  containerStyle,
  onCommit,
  onExit,
}: {
  initialText: string;
  initialCaret?: { x: number; y: number } | null;
  containerStyle: CSSProperties;
  onCommit: (text: string) => void;
  onExit: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const initialCaretRef = useRef(initialCaret ?? null);
  const initialRef = useRef(initialText);
  const onCommitRef = useRef(onCommit);
  const onExitRef = useRef(onExit);
  const committedRef = useRef(false);
  onCommitRef.current = onCommit;
  onExitRef.current = onExit;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const sel = window.getSelection();
    if (!sel) return;
    const pt = initialCaretRef.current;
    let range: Range | null = null;
    if (pt) {
      const doc = document as Document & {
        caretRangeFromPoint?: (x: number, y: number) => Range | null;
        caretPositionFromPoint?: (
          x: number,
          y: number,
        ) => { offsetNode: Node; offset: number } | null;
      };
      if (doc.caretRangeFromPoint) {
        range = doc.caretRangeFromPoint(pt.x, pt.y);
      } else if (doc.caretPositionFromPoint) {
        const cp = doc.caretPositionFromPoint(pt.x, pt.y);
        if (cp) {
          range = document.createRange();
          range.setStart(cp.offsetNode, cp.offset);
        }
      }
      // discard a point that resolved outside this editable element
      if (range && !el.contains(range.startContainer)) range = null;
    }
    if (!range) {
      // no usable click point (e.g. keyboard Enter) — place caret at the end
      range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
    } else {
      range.collapse(true);
    }
    try {
      sel.removeAllRanges();
      sel.addRange(range);
    } catch {
      // ignore if selection fails
    }
    // Clicking the canvas background unmounts this element before `blur`
    // fires, so commit on unmount too (idempotent via committedRef).
    return () => {
      if (committedRef.current) return;
      committedRef.current = true;
      const next = el.innerText ?? "";
      if (next !== initialRef.current) {
        onCommitRef.current(next);
      }
    };
  }, []);

  const commit = useCallback(() => {
    if (committedRef.current) return;
    committedRef.current = true;
    const next = ref.current?.innerText ?? "";
    if (next !== initialRef.current) {
      onCommitRef.current(next);
    }
  }, []);

  const handleBlur = useCallback(() => {
    commit();
    onExitRef.current();
  }, [commit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        ref.current?.blur();
        return;
      }
      // Enter commits; Shift+Enter inserts a newline.
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        ref.current?.blur();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        ref.current?.blur();
        return;
      }
    },
    [],
  );

  return (
    <div
      ref={ref}
      className="h-full w-full outline-none"
      style={{
        ...containerStyle,
        cursor: "text",
        userSelect: "text",
        WebkitUserSelect: "text",
        MozUserSelect: "text",
        msUserSelect: "text",
        caretColor: "rgb(99 102 241)",
      }}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onInput={(e) => {
        const target = e.target as HTMLDivElement;
        if (target.innerText === "" && initialRef.current !== "") {
          target.innerText = "\n";
          const range = document.createRange();
          range.selectNodeContents(target);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }}
    >
      {initialText}
    </div>
  );
}
