# @waku/sdk-next

Next.js helpers for [Waku](https://github.com/) image templates.

## Install

```bash
pnpm add @waku/sdk-next
```

## Quickstart

In any page or layout:

```tsx
import { createOgMetadata } from "@waku/sdk-next";

export const metadata = createOgMetadata({
  user: "naresh",
  template: "big-title",
  params: { title: "My new blog post", subtitle: "October 2025" },
});
```

This drops `openGraph.images` and `twitter` blocks straight into your page metadata.

## Env defaults

Set `WAKU_BASE_URL` and `WAKU_USER` and you can omit them per-call:

```tsx
export const metadata = createOgMetadata({
  template: "big-title",
  params: { title: "Hello" },
});
```

## Inline image

```tsx
import { OgImage } from "@waku/sdk-next/og-image";

export default function Page() {
  return (
    <OgImage
      user="naresh"
      template="big-title"
      params={{ title: "Hi" }}
      alt="Big title image"
    />
  );
}
```
