import { describe, expect, it } from "vitest";
import {
  ParamResolutionError,
  collectParams,
  resolve,
  type Node,
} from "../index.js";

const big = (): Node => ({
  type: "frame",
  w: 1200,
  h: 630,
  bg: "#0b0b0b",
  children: [
    {
      type: "text",
      value: { $param: "title" },
      color: { $param: "titleColor", default: "#ffffff" },
      font: { family: "Inter", weight: 700 },
      size: 64,
    },
    {
      type: "image",
      src: { $param: "logo" },
      fit: "contain",
      w: 96,
      h: 96,
    },
  ],
});

describe("resolve", () => {
  it("substitutes a required param", () => {
    const out = resolve(big(), { title: "Hello", logo: "https://x/y.png" });
    expect(out.type).toBe("frame");
    if (out.type !== "frame" || !out.children) throw new Error();
    expect((out.children[0] as any).value).toBe("Hello");
    expect((out.children[0] as any).color).toBe("#ffffff");
    expect((out.children[1] as any).src).toBe("https://x/y.png");
  });

  it("uses default when param missing", () => {
    const out = resolve(big(), { title: "Hi", logo: "x" });
    if (out.type !== "frame" || !out.children) throw new Error();
    expect((out.children[0] as any).color).toBe("#ffffff");
  });

  it("user-supplied value overrides default", () => {
    const out = resolve(big(), { title: "Hi", logo: "x", titleColor: "#ff0" });
    if (out.type !== "frame" || !out.children) throw new Error();
    expect((out.children[0] as any).color).toBe("#ff0");
  });

  it("throws on missing required param without default", () => {
    expect(() => resolve(big(), { logo: "x" })).toThrowError(ParamResolutionError);
  });

  it("does not mutate the input tree", () => {
    const ir = big();
    const before = JSON.stringify(ir);
    resolve(ir, { title: "Hi", logo: "x" });
    expect(JSON.stringify(ir)).toBe(before);
  });

  it("resolves fill on frame.bg when bound to a param", () => {
    const ir: Node = {
      type: "frame",
      w: 100,
      h: 100,
      bg: { $param: "bgColor", default: "#fff" },
    };
    const out = resolve(ir, { bgColor: "#000" });
    expect((out as any).bg).toBe("#000");
  });
});

describe("collectParams", () => {
  it("collects every referenced param name", () => {
    const ir = big();
    const params = collectParams(ir);
    expect(params).toEqual(new Set(["title", "titleColor", "logo"]));
  });

  it("handles nested stacks and shapes", () => {
    const ir: Node = {
      type: "frame",
      w: 100,
      h: 100,
      children: [
        {
          type: "stack",
          dir: "col",
          bg: { $param: "stackBg" },
          children: [
            { type: "shape", kind: "rect", w: 10, h: 10, fill: { $param: "rectFill" } },
          ],
        },
      ],
    };
    expect(collectParams(ir)).toEqual(new Set(["stackBg", "rectFill"]));
  });
});
