import { describe, expect, it } from "vitest";
import {
  findMissingParamDeclarations,
  paramsSchemaToZod,
  validateIR,
  validateParams,
  type Node,
  type ParamsSchema,
} from "../index.js";

describe("validateIR", () => {
  it("accepts a valid frame", () => {
    const ir: Node = { type: "frame", w: 1200, h: 630 };
    const r = validateIR(ir);
    expect(r.ok).toBe(true);
  });

  it("rejects a non-frame root", () => {
    const r = validateIR({ type: "text", value: "x", font: { family: "Inter" }, size: 32, color: "#000" });
    expect(r.ok).toBe(false);
  });

  it("rejects a frame missing dimensions", () => {
    const r = validateIR({ type: "frame", w: 1200 });
    expect(r.ok).toBe(false);
  });

  it("accepts nested children with param refs", () => {
    const r = validateIR({
      type: "frame",
      w: 1200,
      h: 630,
      children: [
        {
          type: "text",
          value: { $param: "title" },
          color: "#000",
          font: { family: "Inter" },
          size: 48,
        },
      ],
    });
    expect(r.ok).toBe(true);
  });
});

describe("paramsSchemaToZod", () => {
  it("coerces query string numbers", () => {
    const z = paramsSchemaToZod({ count: { kind: "number" } });
    const r = z.safeParse({ count: "42" });
    expect(r.success && r.data.count).toBe(42);
  });

  it("coerces booleans from URL string forms", () => {
    const z = paramsSchemaToZod({ flag: { kind: "boolean" } });
    expect(z.parse({ flag: "true" }).flag).toBe(true);
    expect(z.parse({ flag: "1" }).flag).toBe(true);
    expect(z.parse({ flag: "false" }).flag).toBe(false);
    expect(z.parse({ flag: "0" }).flag).toBe(false);
  });

  it("validates enums", () => {
    const z = paramsSchemaToZod({
      theme: { kind: "enum", values: ["light", "dark"], default: "light" },
    });
    expect(z.parse({}).theme).toBe("light");
    expect(z.parse({ theme: "dark" }).theme).toBe("dark");
    expect(z.safeParse({ theme: "purple" }).success).toBe(false);
  });

  it("enforces URL allowedHosts", () => {
    const z = paramsSchemaToZod({
      img: { kind: "url", allowedHosts: ["images.unsplash.com"] },
    });
    expect(z.safeParse({ img: "https://images.unsplash.com/x.jpg" }).success).toBe(true);
    expect(z.safeParse({ img: "https://evil.com/x.jpg" }).success).toBe(false);
  });

  it("validates colors", () => {
    const z = paramsSchemaToZod({ c: { kind: "color" } });
    expect(z.safeParse({ c: "#fff" }).success).toBe(true);
    expect(z.safeParse({ c: "#ff00ff" }).success).toBe(true);
    expect(z.safeParse({ c: "rgb(0,0,0)" }).success).toBe(true);
    expect(z.safeParse({ c: "not a color" }).success).toBe(false);
  });
});

describe("validateParams", () => {
  it("works with URLSearchParams input", () => {
    const schema: ParamsSchema = {
      title: { kind: "string", maxLen: 80 },
      theme: { kind: "enum", values: ["light", "dark"], default: "light" },
    };
    const sp = new URLSearchParams("title=Hello");
    const r = validateParams(schema, sp);
    expect(r.ok && r.value.title).toBe("Hello");
    expect(r.ok && r.value.theme).toBe("light");
  });
});

describe("findMissingParamDeclarations", () => {
  it("flags params used in IR but not declared", () => {
    const ir: Node = {
      type: "frame",
      w: 1200,
      h: 630,
      children: [
        {
          type: "text",
          value: { $param: "title" },
          color: "#000",
          font: { family: "Inter" },
          size: 48,
        },
      ],
    };
    const missing = findMissingParamDeclarations(ir, {});
    expect(missing).toEqual(["title"]);
  });

  it("returns empty when all declared", () => {
    const ir: Node = {
      type: "frame",
      w: 1200,
      h: 630,
      children: [
        {
          type: "text",
          value: { $param: "title" },
          color: "#000",
          font: { family: "Inter" },
          size: 48,
        },
      ],
    };
    const missing = findMissingParamDeclarations(ir, {
      title: { kind: "string" },
    });
    expect(missing).toEqual([]);
  });
});
