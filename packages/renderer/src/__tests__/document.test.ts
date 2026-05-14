import { describe, expect, it } from "vitest";

import {
  paramsFromSearch,
  searchFromParams,
  type ParamsSchema,
} from "../document";

const schema: ParamsSchema = {
  title: { kind: "string", default: "hi" },
  color: { kind: "color", default: "#fff" },
  image: { kind: "string", default: "https://example.com/img.jpg" },
};

describe("paramsFromSearch", () => {
  it("reads string and color params from search", () => {
    const sp = new URLSearchParams(
      "title=hello&color=%23ff0000&image=https%3A%2F%2Fa.com%2Fb.jpg",
    );
    expect(paramsFromSearch(sp, schema)).toEqual({
      title: "hello",
      color: "#ff0000",
      image: "https://a.com/b.jpg",
    });
  });

  it("skips missing keys", () => {
    const sp = new URLSearchParams("title=hello");
    expect(paramsFromSearch(sp, schema)).toEqual({ title: "hello" });
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
      color: "#ff0000",
      image: "https://a.com/img.jpg",
    };
    const sp = searchFromParams(values, schema);
    expect(paramsFromSearch(sp, schema)).toEqual(values);
  });

  it("skips empty values", () => {
    const sp = searchFromParams({ title: "", color: "" }, schema);
    expect([...sp.keys()]).toEqual([]);
  });
});
