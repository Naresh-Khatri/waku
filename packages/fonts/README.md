# @waku/fonts

Fetches Google/Bunny fonts on demand for two surfaces:

- **Browser canvas + font picker** — gets the `@font-face` CSS plus a WOFF2 URL. The browser does the rest.
- **Satori SSR (renderer)** — gets WOFF bytes as an `ArrayBuffer`. Satori accepts TTF/OTF/WOFF but **not** WOFF2.

One provider (Bunny Fonts), one cache, two entry points.

## Why Bunny?

Bunny mirrors the Google Fonts API: same family names, same versioning, same CSS shape. It serves WOFF2 + WOFF in parallel at predictable paths, with no User-Agent hacks. It's GDPR-friendly and CDN-fast. The trade-off: Bunny does **not** host TTF. We work around that by serving WOFF to Satori instead, which works because Satori reads WOFF natively.

## End-to-end flow

```
                       getFontCss({family, weight, style?})           (browser / RSC)
                              │
                              ▼
                      ┌───────────────────┐
                      │ in-memory cache   │ key = scope|family|weight|style|display
                      │ (Promise<T>)      │ first writer wins, failures auto-evict
                      └────────┬──────────┘
                               │ miss
                               ▼
        GET https://fonts.bunny.net/css2?family=Inter:ital,wght@0,400&display=swap
                               │
                               ▼
              @font-face blocks with `src: url(...woff2)` per unicode-range
                               │
                  ┌────────────┴─────────────┐
                  │                          │
            getFontCss returns         getFontBuffer:
            { css, url }                 1. parse @font-face that matches (weight, style)
            Caller injects <style>       2. extract woff2 URL
            into <head>                  3. swap .woff2 → .woff
                                         4. fetch bytes
                                         5. return { data: ArrayBuffer }
                                         Caller hands to Satori `fonts: [{data, ...}]`
```

## API

```ts
// browser / RSC — never ships font bytes
import { getFontCss } from "@waku/fonts/css";
const { css, url } = await getFontCss({ family: "Inter", weight: 700 });

// server — for Satori
import { getFontBuffer } from "@waku/fonts/server";
const { data } = await getFontBuffer({ family: "Inter", weight: 700 });
```

Both functions accept `{ family, weight?, style?, display? }`:

- `family` — exact name as Bunny/Google lists it (`"Playfair Display"`, not `"playfair display"`).
- `weight` — `100`–`900`, defaults to `400`.
- `style` — `"normal"` (default) or `"italic"`.
- `display` — passed through to the CSS API. Defaults to `"swap"`.

## Caching

A single in-process `Map<string, Promise<T>>`. Storing the promise (not the resolved value) means concurrent callers share one fetch. Failed promises evict themselves so transient errors can retry. The cache is keyed per *variant* — `Inter 400` and `Inter 700` don't share an entry, but the underlying CSS response (which lists all weights of a family) is cached separately and shared across variants.

Cache lives for the process lifetime. No on-disk persistence — fine for serverless, and the request volume is tiny because each variant fetches once per cold start.

## Cost & latency

Per cold start, per family/weight:

- 1× CSS fetch (~2 KB, one round-trip).
- 1× font file fetch — WOFF2 ~30–60 KB to browser, WOFF ~50–120 KB to renderer.

The browser also benefits from Bunny's CDN cache, so cross-page navigations are free. The renderer's process-level cache means a warm Lambda pays zero round-trips after first use.

## Constraints

- **Family names** must match Bunny's catalog. Misspellings 404. Maintain the canonical list in `packages/renderer/src/document.ts` (`FONT_FAMILY_VALUES`) and only request those.
- **Static instances only.** Each (family, weight, style) is its own fetch and its own Satori font entry — variable fonts are not supported by Satori.
- **No subsets parameter** today. Bunny returns Latin + extended ranges by default via `unicode-range`; CJK would need additional plumbing.
