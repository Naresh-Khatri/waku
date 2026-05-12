import { describe, expect, it } from "vitest";

import {
  paramsFromSearch,
  searchFromParams,
  type ParamsSchema,
} from "../document";

const schema: ParamsSchema = {
  title: { kind: "string", default: "hi" },
  size: { kind: "number", default: 10 },
  on: { kind: "boolean", default: true },
  color: { kind: "color", default: "#fff" },
  url: { kind: "url", default: "" },
  variant: { kind: "enum", values: ["a", "b"], default: "a" },
};

describe("paramsFromSearch", () => {
  it("coerces by kind", () => {
    const sp = new URLSearchParams(
      "title=hello&size=42&on=1&color=%23ff0000&url=https%3A%2F%2Fa.com%2Fb&variant=b",
    );
    expect(paramsFromSearch(sp, schema)).toEqual({
      title: "hello",
      size: 42,
      on: true,
      color: "#ff0000",
      url: "https://a.com/b",
      variant: "b",
    });
  });

  it("drops invalid number, invalid enum, missing keys", () => {
    const sp = new URLSearchParams("size=NaN&variant=z");
    expect(paramsFromSearch(sp, schema)).toEqual({});
  });

  it("treats true/1 as boolean true; otherwise false", () => {
    expect(paramsFromSearch(new URLSearchParams("on=true"), schema)).toEqual({
      on: true,
    });
    expect(paramsFromSearch(new URLSearchParams("on=0"), schema)).toEqual({
      on: false,
    });
  });

  it("ignores reserved keys silently", () => {
    const sp = new URLSearchParams("format=png&_sig=abc&_ts=1&title=ok");
    expect(paramsFromSearch(sp, schema)).toEqual({ title: "ok" });
  });
});

describe("searchFromParams", () => {
  it("round-trips clean values", () => {
    const values = {
      title: "hello",
      size: 42,
      on: true,
      color: "#ff0000",
      url: "https://a.com",
      variant: "b" as const,
    };
    const sp = searchFromParams(values, schema);
    expect(paramsFromSearch(sp, schema)).toEqual(values);
  });

  it("skips empty/invalid values", () => {
    const sp = searchFromParams(
      { title: "", size: NaN, on: undefined, variant: "z" },
      schema,
    );
    expect([...sp.keys()]).toEqual([]);
  });
});
