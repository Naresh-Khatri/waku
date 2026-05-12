import { NextResponse, type NextRequest } from "next/server";
import { render } from "@waku/renderer";
import { paramsFromSearch, paramsWithDefaults } from "@waku/renderer/document";

import { loadStockTemplate } from "@/lib/db";
import { renderErrorImage } from "@/lib/error-image";
import { negotiateFormat } from "@/lib/format";
import {
  hashParams,
  logRender,
  RENDER_BUDGET_MS,
  RenderTimeoutError,
  withBudget,
} from "@/lib/observability";
import { proxyImage } from "@/lib/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stock templates are admin-edited and shown in the catalogue. Edits are
// frequent during authoring, so keep the cache short.
const CACHE_HEADER = "public, max-age=30, s-maxage=60";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const started = Date.now();
  const { slug } = await ctx.params;

  const url = new URL(req.url);
  const accept = req.headers.get("accept");
  const queryFormat = url.searchParams.get("format");
  const format = negotiateFormat(queryFormat, accept);

  if (format === null) {
    return NextResponse.json(
      { error: `format=${queryFormat ?? ""} not supported` },
      { status: 400 },
    );
  }

  const tpl = await loadStockTemplate(slug);
  if (!tpl) {
    logRender({
      evt: "render",
      slug: `stock/${slug}`,
      version: 0,
      params_hash: "",
      status: 404,
      ms: Date.now() - started,
      format,
      err: "not_found",
    });
    const out = await renderErrorImage(
      "Stock template not found",
      `stock/${slug}`,
      format,
    );
    return new Response(new Uint8Array(out.buffer), {
      status: 404,
      headers: { "Content-Type": out.contentType, "Cache-Control": "no-store" },
    });
  }

  const draft = paramsWithDefaults(
    paramsFromSearch(url.searchParams, tpl.document.paramsSchema),
    tpl.document.paramsSchema,
  );
  const paramsHash = hashParams(draft);

  try {
    const out = await withBudget(
      render(tpl.document, draft, {
        format,
        loadImage: async (src: string) => {
          const r = await proxyImage(src);
          return { data: r.body, contentType: r.contentType };
        },
      }),
      RENDER_BUDGET_MS,
    );
    logRender({
      evt: "render",
      slug: `stock/${slug}`,
      version: 0,
      params_hash: paramsHash,
      status: 200,
      ms: Date.now() - started,
      format,
    });
    return new Response(new Uint8Array(out.buffer), {
      status: 200,
      headers: {
        "Content-Type": out.contentType,
        "Cache-Control": CACHE_HEADER,
        "X-Waku-Stock": tpl.id,
      },
    });
  } catch (err) {
    const isTimeout = err instanceof RenderTimeoutError;
    const status = isTimeout ? 504 : 500;
    const code = isTimeout ? "timeout" : "render_failed";
    const message =
      err instanceof Error ? err.message : "Unknown render failure";
    logRender({
      evt: "render",
      slug: `stock/${slug}`,
      version: 0,
      params_hash: paramsHash,
      status,
      ms: Date.now() - started,
      format,
      err: code,
    });
    const out = await renderErrorImage(
      isTimeout ? "Render timed out" : "Render failed",
      message,
      format,
    );
    return new Response(new Uint8Array(out.buffer), {
      status,
      headers: { "Content-Type": out.contentType, "Cache-Control": "no-store" },
    });
  }
}
