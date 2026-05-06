# @waku/ir

JSON IR for Waku image templates. Types, Zod schemas, param resolution.

This package is the contract between the editor, the renderer, and the SDKs.
A template is a JSON tree (`Node`) plus a separate `ParamsSchema` describing
which URL params are allowed.

## Quick example

```ts
import {
  resolve,
  validateIR,
  validateParams,
  type Node,
  type ParamsSchema,
} from "@waku/ir";

const ir: Node = {
  type: "frame",
  w: 1200,
  h: 630,
  bg: "#0b0b0b",
  children: [
    {
      type: "text",
      value: { $param: "title" },
      color: "#ffffff",
      font: { family: "Inter", weight: 700 },
      size: 64,
    },
  ],
};

const paramsSchema: ParamsSchema = {
  title: { kind: "string", maxLen: 120, default: "Hello" },
};

const ir_valid = validateIR(ir);                            // {ok: true, value: ...}
const params = validateParams(paramsSchema, new URLSearchParams("title=Hi")); // {ok: true, value: {title: 'Hi'}}
const resolved = resolve(ir, params.ok ? params.value : {}); // tree with {$param} replaced
```

## Node types (v1)

`frame` · `stack` · `text` · `image` · `shape` · `gradient`

Anything Satori cannot render is intentionally absent (no filters, blurs,
masks, raw SVG escape hatch). Add nodes when a real template demands one.

## Param schema kinds

`string` · `number` · `boolean` · `enum` · `url` (with optional host allowlist) · `color`

URL coercion is built in: `?count=42` parses to `42`, `?flag=true` to `true`.
