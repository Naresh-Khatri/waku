import {
  paintToCss,
  paintToSvgPaint,
  resolveValue,
  type EditorNode,
  type EllipseNode,
  type ImageNode,
  type LineNode,
  type Paint,
  type RectangleNode,
  type StarNode,
  type TemplateDocument,
  type TextNode,
  type TriangleNode,
} from "./document";

type SatoriProps = {
  style?: Record<string, unknown>;
  children?: SatoriElement | SatoriElement[] | string;
  [key: string]: unknown;
};

export type SatoriElement = {
  type: string;
  props: SatoriProps;
};

const el = (type: string, props: SatoriProps): SatoriElement => ({
  type,
  props,
});

type Draft = Record<string, unknown>;

export type ImageLoader = (
  url: string,
) => Promise<{ data: Uint8Array; contentType: string }>;

const toDataUri = (data: Uint8Array, contentType: string): string => {
  const b64 = Buffer.from(data).toString("base64");
  return `data:${contentType};base64,${b64}`;
};

/**
 * Walks the satori tree and replaces any <img src="http(s)://..."> with a
 * data: URI loaded via `loadImage`. Existing data: / file: srcs are left
 * untouched. Lets the render app gate remote fetches through its SSRF guard.
 */
export async function resolveImages(
  root: SatoriElement,
  loadImage: ImageLoader,
): Promise<void> {
  const visit = async (node: SatoriElement): Promise<void> => {
    const { props } = node;
    if (node.type === "img" && typeof props.src === "string") {
      const src = props.src;
      if (src.startsWith("http://") || src.startsWith("https://")) {
        const { data, contentType } = await loadImage(src);
        props.src = toDataUri(data, contentType);
      }
    }
    const children = props.children;
    if (Array.isArray(children)) {
      for (const c of children) {
        if (c && typeof c === "object" && "type" in c) await visit(c);
      }
    } else if (children && typeof children === "object" && "type" in children) {
      await visit(children);
    }
  };
  await visit(root);
}

export function documentToSatori(
  doc: TemplateDocument,
  draft: Draft,
): SatoriElement {
  const visible = doc.nodes.filter((n) => n.visible);
  const children = visible.map((n) => nodeToSatori(n, draft));
  const bg = doc.artboard.background;
  const bgStyle: Record<string, unknown> =
    bg.kind === "flat"
      ? { backgroundColor: paintToCss(bg, draft) }
      : { backgroundImage: paintToCss(bg, draft) };
  return el("div", {
    style: {
      display: "flex",
      position: "relative",
      width: doc.artboard.width,
      height: doc.artboard.height,
      ...bgStyle,
      overflow: "hidden",
    },
    children,
  });
}

function nodeToSatori(node: EditorNode, draft: Draft): SatoriElement {
  const wrap = (inner: SatoriElement): SatoriElement => {
    const style: Record<string, unknown> = {
      position: "absolute",
      display: "flex",
      left: node.x,
      top: node.y,
      width: node.width,
      height: node.height,
      opacity: node.opacity,
    };
    if (node.rotation !== 0) {
      style.transform = `rotate(${node.rotation}deg)`;
      style.transformOrigin = "center center";
    }
    return el("div", { style, children: inner });
  };

  switch (node.type) {
    case "image":
      return wrap(imageNode(node, draft));
    case "text":
      return wrap(textNode(node, draft));
    case "rectangle":
      return wrap(rectangleNode(node, draft));
    case "ellipse":
      return wrap(ellipseNode(node, draft));
    case "triangle":
      return wrap(triangleNode(node, draft));
    case "star":
      return wrap(starNode(node, draft));
    case "line":
      return wrap(lineNode(node, draft));
  }
}

function imageNode(node: ImageNode, draft: Draft): SatoriElement {
  const src = resolveValue(node.src, draft) ?? "";
  const imgStyle: Record<string, unknown> = {
    width: node.width,
    height: node.height,
    objectFit: node.fit,
  };
  if (node.cornerRadius > 0) imgStyle.borderRadius = node.cornerRadius;
  const hasFlatStroke = node.strokeWidth > 0 && node.stroke.kind === "flat";
  if (hasFlatStroke) {
    imgStyle.border = `${node.strokeWidth}px solid ${paintToCss(node.stroke, draft)}`;
    imgStyle.boxSizing = "border-box";
  }
  if (node.shadow) {
    const shadowColor = resolveValue(node.shadow.color, draft) ?? "#00000040";
    imgStyle.boxShadow = `${node.shadow.offsetX}px ${node.shadow.offsetY}px ${node.shadow.blur}px ${shadowColor}`;
  }
  const img = el("img", {
    src,
    width: node.width,
    height: node.height,
    style: imgStyle,
  });
  if (node.strokeWidth > 0 && node.stroke.kind !== "flat") {
    const innerW = Math.max(0, node.width - node.strokeWidth * 2);
    const innerH = Math.max(0, node.height - node.strokeWidth * 2);
    const innerR = Math.max(0, node.cornerRadius - node.strokeWidth);
    const innerImg = el("img", {
      src,
      width: innerW,
      height: innerH,
      style: {
        width: innerW,
        height: innerH,
        objectFit: node.fit,
        borderRadius: innerR,
      },
    });
    return el("div", {
      style: {
        display: "flex",
        width: node.width,
        height: node.height,
        borderRadius: node.cornerRadius,
        padding: node.strokeWidth,
        boxSizing: "border-box",
        backgroundImage: paintToCss(node.stroke, draft),
        ...(node.shadow
          ? {
              boxShadow: `${node.shadow.offsetX}px ${node.shadow.offsetY}px ${node.shadow.blur}px ${
                resolveValue(node.shadow.color, draft) ?? "#00000040"
              }`,
            }
          : {}),
      },
      children: innerImg,
    });
  }
  return img;
}

const ALLOWED_FONTS = new Set(["Inter"]);

function textNode(node: TextNode, draft: Draft): SatoriElement {
  const text = resolveValue(node.text, draft) ?? "";
  const fontFamily = ALLOWED_FONTS.has(node.fontFamily) ? node.fontFamily : "Inter";
  const colorStyle: Record<string, unknown> =
    node.color.kind === "flat"
      ? { color: paintToCss(node.color, draft) }
      : {
          color: "transparent",
          backgroundImage: paintToCss(node.color, draft),
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
        };
  return el("div", {
    style: {
      width: node.width,
      height: node.height,
      display: "flex",
      alignItems: "center",
      justifyContent:
        node.align === "center"
          ? "center"
          : node.align === "right"
            ? "flex-end"
            : "flex-start",
      fontFamily,
      fontSize: node.fontSize,
      fontWeight: node.fontWeight,
      fontStyle: node.italic ? "italic" : "normal",
      ...colorStyle,
      textAlign: node.align,
      letterSpacing: node.letterSpacing,
      lineHeight: node.lineHeight,
      whiteSpace: "pre-wrap",
    },
    children: text,
  });
}

function fillBgStyle(
  paint: Paint,
  draft: Draft,
): Record<string, unknown> {
  const css = paintToCss(paint, draft);
  return paint.kind === "flat"
    ? { backgroundColor: css }
    : { backgroundImage: css };
}

/**
 * Renders a rounded-rect / ellipse shape with fill + stroke. When the stroke
 * is a gradient, wraps the fill inside a padded gradient-bg outer; CSS borders
 * cannot accept gradients directly.
 */
function divShape(
  width: number,
  height: number,
  fill: Paint,
  stroke: Paint,
  strokeWidth: number,
  borderRadius: number | string,
  draft: Draft,
): SatoriElement {
  const fillStyle = fillBgStyle(fill, draft);
  if (strokeWidth <= 0) {
    return el("div", {
      style: {
        width,
        height,
        borderRadius,
        boxSizing: "border-box",
        ...fillStyle,
      },
    });
  }
  if (stroke.kind === "flat") {
    return el("div", {
      style: {
        width,
        height,
        borderRadius,
        boxSizing: "border-box",
        border: `${strokeWidth}px solid ${paintToCss(stroke, draft)}`,
        ...fillStyle,
      },
    });
  }
  const innerW = Math.max(0, width - strokeWidth * 2);
  const innerH = Math.max(0, height - strokeWidth * 2);
  const innerRadius =
    typeof borderRadius === "number"
      ? Math.max(0, borderRadius - strokeWidth)
      : borderRadius;
  const inner = el("div", {
    style: {
      width: innerW,
      height: innerH,
      borderRadius: innerRadius,
      ...fillStyle,
    },
  });
  return el("div", {
    style: {
      display: "flex",
      width,
      height,
      borderRadius,
      padding: strokeWidth,
      boxSizing: "border-box",
      backgroundImage: paintToCss(stroke, draft),
    },
    children: inner,
  });
}

function rectangleNode(node: RectangleNode, draft: Draft): SatoriElement {
  return divShape(
    node.width,
    node.height,
    node.fill,
    node.stroke,
    node.strokeWidth,
    node.cornerRadius,
    draft,
  );
}

function ellipseNode(node: EllipseNode, draft: Draft): SatoriElement {
  return divShape(
    node.width,
    node.height,
    node.fill,
    node.stroke,
    node.strokeWidth,
    "50%",
    draft,
  );
}

function svgImage(
  width: number,
  height: number,
  body: string,
): SatoriElement {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}' width='${width}' height='${height}'>${body}</svg>`;
  const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return el("img", {
    src: dataUri,
    width,
    height,
    style: { width, height },
  });
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function defsBlock(parts: { def: string }[]): string {
  const inner = parts.map((p) => p.def).join("");
  return inner ? `<defs>${inner}</defs>` : "";
}

function triangleNode(node: TriangleNode, draft: Draft): SatoriElement {
  const w = node.width;
  const h = node.height;
  const fill = paintToSvgPaint(node.fill, `f-${node.id}`, draft);
  const stroke = paintToSvgPaint(node.stroke, `s-${node.id}`, draft);
  const points = `${w / 2},0 ${w},${h} 0,${h}`;
  const body = `${defsBlock([fill, stroke])}<polygon points='${points}' fill='${escapeAttr(fill.ref)}' stroke='${escapeAttr(stroke.ref)}' stroke-width='${node.strokeWidth}' />`;
  return svgImage(w, h, body);
}

function starNode(node: StarNode, draft: Draft): SatoriElement {
  const w = node.width;
  const h = node.height;
  const cx = w / 2;
  const cy = h / 2;
  const ro = Math.min(w, h) / 2;
  const ri = ro * node.innerRadiusRatio;
  const total = node.points * 2;
  const pts: string[] = [];
  for (let i = 0; i < total; i++) {
    const r = i % 2 === 0 ? ro : ri;
    const a = (Math.PI * 2 * i) / total - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  const fill = paintToSvgPaint(node.fill, `f-${node.id}`, draft);
  const stroke = paintToSvgPaint(node.stroke, `s-${node.id}`, draft);
  const body = `${defsBlock([fill, stroke])}<polygon points='${pts.join(" ")}' fill='${escapeAttr(fill.ref)}' stroke='${escapeAttr(stroke.ref)}' stroke-width='${node.strokeWidth}' />`;
  return svgImage(w, h, body);
}

function lineNode(node: LineNode, draft: Draft): SatoriElement {
  const w = node.width;
  const h = node.height;
  const y = h / 2;
  const headLen = Math.min(w * 0.25, node.strokeWidth * 4 + 6);
  const x2 = node.arrow ? w - headLen : w;
  const stroke = paintToSvgPaint(node.stroke, `s-${node.id}`, draft);
  const lineEl = `<line x1='0' y1='${y}' x2='${x2}' y2='${y}' stroke='${escapeAttr(stroke.ref)}' stroke-width='${node.strokeWidth}' stroke-linecap='round' />`;
  const arrowEl = node.arrow
    ? `<polygon points='${w},${y} ${x2},${y - headLen / 2} ${x2},${y + headLen / 2}' fill='${escapeAttr(stroke.ref)}' />`
    : "";
  return svgImage(w, h, `${defsBlock([stroke])}${lineEl}${arrowEl}`);
}

