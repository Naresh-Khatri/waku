import { NextResponse, type NextRequest } from "next/server";
import { render, type RenderFormat } from "@waku/renderer";
import { validateParams } from "@waku/ir";
import { loadTemplateVersion, resolvePublishedVersion } from "@/lib/db";
import {
  RENDER_BUDGET_MS,
  RenderTimeoutError,
  hashParams,
  logRender,
  withBudget,
} from "@/lib/observability";
import { negotiateFormat } from "@/lib/format";
import { renderErrorImage } from "@/lib/error-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_HEADER = "public, immutable, max-age=31536000";

type Ctx = { params: Promise<{ user: string; slug: string; version: string }> };

const RESERVED_PARAMS = new Set(["format", "_sig", "_ts"]);

const stripReserved = (sp: URLSearchParams): URLSearchParams => {
  const out = new URLSearchParams();
  for (const [k, v] of sp.entries()) {
    if (!RESERVED_PARAMS.has(k)) out.append(k, v);
  }
  return out;
};

async function errorResponse(
  status: number,
  title: string,
  message: string,
  format: RenderFormat,
): Promise<Response> {
  try {
    const out = await renderErrorImage(title, message, format);
    return new Response(new Uint8Array(out.buffer), {
      status,
      headers: {
        "Content-Type": out.contentType,
        "Cache-Control": "no-store",
        "X-Waku-Error": title,
      },
    });
  } catch {
    return NextResponse.json({ error: title, message }, { status });
  }
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const started = Date.now();
  const { user, slug, version: versionStr } = await ctx.params;

  const url = new URL(req.url);
  const queryFormat = url.searchParams.get("format");
  const accept = req.headers.get("accept");
  const format = negotiateFormat(queryFormat, accept);

  const finishLog = (
    status: number,
    paramsHash: string,
    versionForLog: number,
    err?: string,
  ) => {
    logRender({
      evt: "render",
      slug: `${user}/${slug}`,
      version: versionForLog,
      params_hash: paramsHash,
      status,
      ms: Date.now() - started,
      ...(format ? { format } : {}),
      ...(err ? { err } : {}),
    });
  };

  if (format === null) {
    finishLog(400, "", -1, "bad_format");
    return errorResponse(
      400,
      "Bad format",
      `?format=${queryFormat ?? ""} not supported`,
      "png",
    );
  }

  // `published` keyword: 302 to the current versioned URL with a short cache.
  if (versionStr === "published") {
    const v = await resolvePublishedVersion(user, slug);
    if (v === null) {
      finishLog(404, "", -1, "no_published");
      return errorResponse(
        404,
        "No published version",
        `${user}/${slug} has no published version`,
        format,
      );
    }
    const target = new URL(req.url);
    target.pathname = `/r/${user}/${slug}/${v}`;
    finishLog(302, "", v);
    return NextResponse.redirect(target, {
      status: 302,
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }

  const version = Number(versionStr);
  if (!Number.isInteger(version) || version < 1) {
    finishLog(400, "", -1, "invalid_version");
    return errorResponse(
      400,
      "Invalid version",
      `Version "${versionStr}" is not a positive integer or "published"`,
      format,
    );
  }

  const tpl = await loadTemplateVersion(user, slug, version);
  if (!tpl) {
    finishLog(404, "", version, "not_found");
    return errorResponse(
      404,
      "Template not found",
      `${user}/${slug}@${version}`,
      format,
    );
  }

  const userParams = stripReserved(url.searchParams);
  const result = validateParams(tpl.params, userParams);
  if (!result.ok) {
    const first = result.error.issues[0];
    const msg = first
      ? `${first.path.join(".")}: ${first.message}`
      : "validation failed";
    finishLog(400, "", version, "invalid_params");
    return errorResponse(400, "Invalid params", msg, format);
  }

  const ph = hashParams(result.value);

  try {
    const out = await withBudget(
      render(tpl.ir, result.value, { format }),
      RENDER_BUDGET_MS,
    );
    finishLog(200, ph, version);
    return new Response(new Uint8Array(out.buffer), {
      status: 200,
      headers: {
        "Content-Type": out.contentType,
        "Cache-Control": CACHE_HEADER,
        "X-Waku-Template": `${user}/${slug}@${version}`,
      },
    });
  } catch (err) {
    if (err instanceof RenderTimeoutError) {
      finishLog(504, ph, version, "timeout");
      return errorResponse(
        504,
        "Render timeout",
        `Exceeded ${RENDER_BUDGET_MS}ms budget`,
        format,
      );
    }
    const message = err instanceof Error ? err.message : "render failed";
    finishLog(500, ph, version, "render_error");
    return errorResponse(500, "Render failed", message, format);
  }
}
