import {
  resolveValue,
  type EditorNode,
  type EllipseNode,
  type ImageNode,
  type LineNode,
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
  return el("div", {
    style: {
      display: "flex",
      position: "relative",
      width: doc.artboard.width,
      height: doc.artboard.height,
      backgroundColor: resolveValue(doc.artboard.background, draft) ?? "#ffffff",
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
  return el("img", {
    src,
    width: node.width,
    height: node.height,
    style: {
      width: node.width,
      height: node.height,
      objectFit: node.fit,
    },
  });
}

const ALLOWED_FONTS = new Set(["Inter"]);

function textNode(node: TextNode, draft: Draft): SatoriElement {
  const text = resolveValue(node.text, draft) ?? "";
  const color = resolveValue(node.color, draft) ?? "#000000";
  const fontFamily = ALLOWED_FONTS.has(node.fontFamily) ? node.fontFamily : "Inter";
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
      color,
      textAlign: node.align,
      letterSpacing: node.letterSpacing,
      lineHeight: node.lineHeight,
      whiteSpace: "pre-wrap",
    },
    children: text,
  });
}

function rectangleNode(node: RectangleNode, draft: Draft): SatoriElement {
  const fill = resolveValue(node.fill, draft) ?? "transparent";
  const stroke = resolveValue(node.stroke, draft) ?? "transparent";
  const style: Record<string, unknown> = {
    width: node.width,
    height: node.height,
    backgroundColor: fill,
    borderRadius: node.cornerRadius,
    boxSizing: "border-box",
  };
  if (node.strokeWidth > 0) {
    style.border = `${node.strokeWidth}px solid ${stroke}`;
  }
  return el("div", { style });
}

function ellipseNode(node: EllipseNode, draft: Draft): SatoriElement {
  const fill = resolveValue(node.fill, draft) ?? "transparent";
  const stroke = resolveValue(node.stroke, draft) ?? "transparent";
  const style: Record<string, unknown> = {
    width: node.width,
    height: node.height,
    backgroundColor: fill,
    borderRadius: "50%",
    boxSizing: "border-box",
  };
  if (node.strokeWidth > 0) {
    style.border = `${node.strokeWidth}px solid ${stroke}`;
  }
  return el("div", { style });
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

function triangleNode(node: TriangleNode, draft: Draft): SatoriElement {
  const fill = resolveValue(node.fill, draft) ?? "transparent";
  const stroke = resolveValue(node.stroke, draft) ?? "transparent";
  const w = node.width;
  const h = node.height;
  const points = `${w / 2},0 ${w},${h} 0,${h}`;
  const body = `<polygon points='${points}' fill='${escapeAttr(fill)}' stroke='${escapeAttr(stroke)}' stroke-width='${node.strokeWidth}' />`;
  return svgImage(w, h, body);
}

function starNode(node: StarNode, draft: Draft): SatoriElement {
  const fill = resolveValue(node.fill, draft) ?? "transparent";
  const stroke = resolveValue(node.stroke, draft) ?? "transparent";
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
  const body = `<polygon points='${pts.join(" ")}' fill='${escapeAttr(fill)}' stroke='${escapeAttr(stroke)}' stroke-width='${node.strokeWidth}' />`;
  return svgImage(w, h, body);
}

function lineNode(node: LineNode, draft: Draft): SatoriElement {
  const stroke = resolveValue(node.stroke, draft) ?? "#000000";
  const w = node.width;
  const h = node.height;
  const y = h / 2;
  const headLen = Math.min(w * 0.25, node.strokeWidth * 4 + 6);
  const x2 = node.arrow ? w - headLen : w;
  const lineEl = `<line x1='0' y1='${y}' x2='${x2}' y2='${y}' stroke='${escapeAttr(stroke)}' stroke-width='${node.strokeWidth}' stroke-linecap='round' />`;
  const arrowEl = node.arrow
    ? `<polygon points='${w},${y} ${x2},${y - headLen / 2} ${x2},${y + headLen / 2}' fill='${escapeAttr(stroke)}' />`
    : "";
  return svgImage(w, h, lineEl + arrowEl);
}

