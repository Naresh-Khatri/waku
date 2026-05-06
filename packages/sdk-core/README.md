# @waku/sdk-core

Framework-agnostic URL builder for [Waku](https://github.com/) image templates. Zero dependencies, tree-shakeable, deterministic encoding.

## Install

```bash
pnpm add @waku/sdk-core
```

## Usage

```ts
import { buildOgUrl } from "@waku/sdk-core";

const url = buildOgUrl({
  baseUrl: "https://r.waku.dev",
  user: "naresh",
  template: "big-title",
  version: "published", // or a number, or omit (defaults to "published")
  params: { title: "Hello world", subtitle: "Welcome" },
  format: "png",
});
// → https://r.waku.dev/r/naresh/big-title/published?subtitle=Welcome&title=Hello%20world
```

Keys are sorted before encoding so two calls with the same params always produce the same URL — same CDN cache entry, regardless of object construction order.

For Next.js, use [`@waku/sdk-next`](../sdk-next).
