import { describe, expect, it } from "vitest";

import {
  documentToSatori,
  resolveImages,
  type SatoriElement,
} from "../flat-tree";
import type { TemplateDocument } from "../document";

const baseNode = {
  rotation: 0,
  opacity: 1,
  visible: true,
  locked: false,
  name: "n",
};

const doc: TemplateDocument = {
  artboard: { width: 200, height: 100, background: "#ffffff" },
  paramsSchema: {
    title: { kind: "string", default: "Hi" },
  },
  nodes: [
    {
      ...baseNode,
      id: "r",
      type: "rectangle",
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      fill: "#ff0000",
      stroke: "#000000",
      strokeWidth: 0,
      cornerRadius: 4,
    },
    {
      ...baseNode,
      id: "t",
      type: "text",
      x: 10,
      y: 10,
      width: 100,
      height: 20,
      text: { $param: "title", default: "Hi" },
      fontSize: 16,
      fontWeight: 400,
      italic: false,
      color: "#000000",
      align: "left",
      fontFamily: "Inter",
      letterSpacing: 0,
      lineHeight: 1.2,
    },
    {
      ...baseNode,
      id: "hidden",
      type: "rectangle",
      visible: false,
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      fill: "#000",
      stroke: "#000",
      strokeWidth: 0,
      cornerRadius: 0,
    },
    {
      ...baseNode,
      id: "img",
      type: "image",
      x: 0,
      y: 50,
      width: 50,
      height: 50,
      src: "https://cdn.example.com/a.png",
      fit: "cover",
    },
  ],
};

describe("documentToSatori", () => {
  it("matches snapshot for a mixed document with bound text", () => {
    const tree = documentToSatori(doc, { title: "Hello" });
    expect(tree).toMatchSnapshot();
  });

  it("hides nodes with visible=false", () => {
    const tree = documentToSatori(doc, {});
    const children = tree.props.children as SatoriElement[];
    const ids = children
      .map((c) => (c.props.children as SatoriElement | undefined))
      .map((inner) => inner);
    expect(children).toHaveLength(3);
    expect(ids).toBeDefined();
  });

  it("falls back to ParamRef default when draft value is missing", () => {
    const tree = documentToSatori(doc, {});
    const text = (tree.props.children as SatoriElement[])[1]!;
    const inner = text.props.children as SatoriElement;
    expect(inner.props.children).toBe("Hi");
  });

  it("omits transform when rotation is 0", () => {
    const tree = documentToSatori(doc, {});
    const wrap = (tree.props.children as SatoriElement[])[0];
    expect((wrap.props.style as Record<string, unknown>).transform).toBeUndefined();
  });

  it("includes transform when rotation is non-zero", () => {
    const rotated = documentToSatori(
      {
        ...doc,
        nodes: [{ ...doc.nodes[0]!, rotation: 45 } as never],
      },
      {},
    );
    const wrap = (rotated.props.children as SatoriElement[])[0];
    expect((wrap.props.style as Record<string, unknown>).transform).toBe(
      "rotate(45deg)",
    );
  });
});

describe("resolveImages", () => {
  it("replaces http(s) src with data URI from loader", async () => {
    const tree = documentToSatori(doc, {});
    const calls: string[] = [];
    await resolveImages(tree, async (url) => {
      calls.push(url);
      return {
        data: new Uint8Array([1, 2, 3]),
        contentType: "image/png",
      };
    });
    expect(calls).toEqual(["https://cdn.example.com/a.png"]);
    const imgWrap = (tree.props.children as SatoriElement[])[2];
    const img = imgWrap.props.children as SatoriElement;
    expect((img.props.src as string).startsWith("data:image/png;base64,")).toBe(
      true,
    );
  });

  it("leaves data: URIs untouched", async () => {
    const inline: TemplateDocument = {
      ...doc,
      nodes: [
        {
          ...(doc.nodes[3] as never),
          src: "data:image/png;base64,aaa",
        } as never,
      ],
    };
    const tree = documentToSatori(inline, {});
    let called = false;
    await resolveImages(tree, async () => {
      called = true;
      return { data: new Uint8Array(), contentType: "image/png" };
    });
    expect(called).toBe(false);
  });
});
