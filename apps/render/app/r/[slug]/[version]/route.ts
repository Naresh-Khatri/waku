import { NextResponse, type NextRequest } from "next/server";
import { render } from "@waku/renderer";
import { validateParams } from "@waku/ir";
import { getTemplate } from "@/templates";
import {
  RENDER_BUDGET_MS,
  RenderTimeoutError,
  hashParams,
  logRender,
  withBudget,
} from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_HEADER = "public, immutable, max-age=31536000";

type Ctx = { params: Promise<{ slug: string; version: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const started = Date.now();
  const { slug, version: versionStr } = await ctx.params;
  const version = Number(versionStr);

  const finish = (
    status: number,
    body: BodyInit,
    headers: HeadersInit,
    paramsHash: string,
    err?: string,
  ): Response => {
    logRender({
      evt: "render",
      slug,
      version: Number.isFinite(version) ? version : -1,
      params_hash: paramsHash,
      status,
      ms: Date.now() - started,
      ...(err ? { err } : {}),
    });
    return new Response(body, { status, headers });
  };

  if (!Number.isInteger(version) || version < 1) {
    return finish(
      400,
      JSON.stringify({ error: "invalid version" }),
      { "Content-Type": "application/json" },
      "",
      "invalid_version",
    );
  }

  const tpl = getTemplate(slug, version);
  if (!tpl) {
    return finish(
      404,
      JSON.stringify({ error: "template not found" }),
      { "Content-Type": "application/json" },
      "",
      "not_found",
    );
  }

  const url = new URL(req.url);
  const result = validateParams(tpl.params, url.searchParams);
  if (!result.ok) {
    return finish(
      400,
      JSON.stringify({ error: "invalid params", issues: result.error.issues }),
      { "Content-Type": "application/json" },
      "",
      "invalid_params",
    );
  }

  const ph = hashParams(result.value);

  try {
    const out = await withBudget(render(tpl.ir, result.value), RENDER_BUDGET_MS);
    return finish(
      200,
      new Uint8Array(out.buffer),
      {
        "Content-Type": out.contentType,
        "Cache-Control": CACHE_HEADER,
        "X-Waku-Template": `${slug}@${version}`,
      },
      ph,
    );
  } catch (err) {
    if (err instanceof RenderTimeoutError) {
      return finish(
        504,
        JSON.stringify({ error: err.message }),
        { "Content-Type": "application/json" },
        ph,
        "timeout",
      );
    }
    const message = err instanceof Error ? err.message : "render failed";
    return finish(
      500,
      JSON.stringify({ error: message }),
      { "Content-Type": "application/json" },
      ph,
      "render_error",
    );
  }
}
