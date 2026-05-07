import { describe, expect, it } from "vitest";

import { buildOgUrl, encodeParams } from "../index";

describe("buildOgUrl", () => {
  it("defaults version to 'published' and uses default base", () => {
    expect(
      buildOgUrl({
        user: "naresh",
        template: "big-title",
        params: { title: "Hi" },
      }),
    ).toBe("https://r.waku.dev/r/naresh/big-title/published?title=Hi");
  });

  it("respects custom baseUrl + numeric version", () => {
    expect(
      buildOgUrl({
        baseUrl: "https://example.test/",
        user: "u",
        template: "t",
        version: 7,
        params: {},
      }),
    ).toBe("https://example.test/r/u/t/7");
  });

  it("encodes format as ?format= rather than path extension", () => {
    expect(
      buildOgUrl({
        user: "u",
        template: "t",
        params: { a: 1 },
        format: "webp",
      }),
    ).toBe("https://r.waku.dev/r/u/t/published?a=1&format=webp");
  });

  it("normalizes jpg to jpeg", () => {
    expect(
      buildOgUrl({
        user: "u",
        template: "t",
        params: {},
        format: "jpg",
      }),
    ).toBe("https://r.waku.dev/r/u/t/published?format=jpeg");
  });

  it("sorts param keys for deterministic cache hits", () => {
    expect(
      buildOgUrl({
        user: "u",
        template: "t",
        params: { z: "1", a: "2" },
      }),
    ).toBe("https://r.waku.dev/r/u/t/published?a=2&z=1");
  });

  it("encodes special chars in path segments + values", () => {
    expect(
      buildOgUrl({
        user: "n a",
        template: "big/title",
        params: { title: "Hi & bye" },
      }),
    ).toBe(
      "https://r.waku.dev/r/n%20a/big%2Ftitle/published?title=Hi%20%26%20bye",
    );
  });
});

describe("encodeParams", () => {
  it("drops undefined and null", () => {
    expect(encodeParams({ a: 1, b: undefined, c: null })).toBe("a=1");
  });

  it("emits boolean as true/false", () => {
    expect(encodeParams({ on: true, off: false })).toBe("off=false&on=true");
  });

  it("repeats key for arrays", () => {
    expect(encodeParams({ tag: ["x", "y"] })).toBe("tag=x&tag=y");
  });
});
