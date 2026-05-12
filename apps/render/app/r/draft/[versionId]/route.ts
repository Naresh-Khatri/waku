import { NextResponse, type NextRequest } from "next/server";
import { render, type RenderFormat } from "@waku/renderer";
import { paramsFromSearch, paramsWithDefaults } from "@waku/renderer/document";

import { loadDraftById, recordRenderLog } from "@/lib/db";
import {
  hashParams,
  logRender,
  RENDER_BUDGET_MS,
  RenderTimeoutError,
  withBudget,
} from "@/lib/observability";
import { negotiateFormat } from "@/lib/format";
import { renderErrorImage } from "@/lib/error-image";
import { proxyImage } from "@/lib/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Drafts are private, mutable previews — never cache them at any layer.
const DRAFT_CACHE_HEADER = "private, no-store";

// TODO(security): the versionId UUID is currently the only access token.
// Add an HMAC-signed `?sig=` derived from BETTER_AUTH_SECRET once the editor
// can sign URLs server-side. UUIDs are unguessable but they leak through
// referrers/logs, which is fine for embedded previews and not fine for shared
// links.
type Ctx = { params: Promise<{ versionId: string }> };

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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest, ctx: Ctx) {
  const started = Date.now();
  const { versionId } = await ctx.params;

  const url = new URL(req.url);
  const queryFormat = url.searchParams.get("format");
  const accept = req.headers.get("accept");
  const format = negotiateFormat(queryFormat, accept);

  const finishLog = (status: number, paramsHash: string, err?: string) => {
    logRender({
      evt: "render",
      slug: `draft/${versionId}`,
      version: -1,
      params_hash: paramsHash,
      status,
      ms: Date.now() - started,
      ...(format ? { format } : {}),
      ...(err ? { err } : {}),
    });
  };

  if (format === null) {
    finishLog(400, "", "bad_format");
    return errorResponse(
      400,
      "Bad format",
      `?format=${queryFormat ?? ""} not supported`,
      "png",
    );
  }

  if (!UUID_RE.test(versionId)) {
    finishLog(400, "", "bad_version_id");
    return errorResponse(400, "Bad versionId", versionId, format);
  }

  const tpl = await loadDraftById(versionId);
  if (!tpl) {
    finishLog(404, "", "not_found");
    return errorResponse(404, "Draft not found", versionId, format);
  }

  const draft = paramsWithDefaults(
    paramsFromSearch(url.searchParams, tpl.document.paramsSchema),
    tpl.document.paramsSchema,
  );
  const paramsHash = hashParams(draft);

  const widthParam = Number(url.searchParams.get("w"));
  const qualityParam = Number(url.searchParams.get("q"));
  const overrideWidth =
    Number.isFinite(widthParam) && widthParam >= 64 && widthParam <= 2400
      ? Math.round(widthParam)
      : undefined;
  const overrideHeight = overrideWidth
    ? Math.round(
        (overrideWidth * tpl.document.artboard.height) /
          tpl.document.artboard.width,
      )
    : undefined;
  const overrideQuality =
    Number.isFinite(qualityParam) && qualityParam >= 1 && qualityParam <= 100
      ? Math.round(qualityParam)
      : undefined;

  try {
    const out = await withBudget(
      render(tpl.document, draft, {
        format,
        ...(overrideWidth ? { width: overrideWidth } : {}),
        ...(overrideHeight ? { height: overrideHeight } : {}),
        ...(overrideQuality ? { quality: overrideQuality } : {}),
        loadImage: async (src: string) => {
          const r = await proxyImage(src);
          return { data: r.body, contentType: r.contentType };
        },
      }),
      RENDER_BUDGET_MS,
    );
    const ms = Date.now() - started;
    recordRenderLog({
      templateVersionId: tpl.versionId,
      paramsHash,
      format,
      ms,
      status: 200,
    });
    finishLog(200, paramsHash);
    return new Response(new Uint8Array(out.buffer), {
      status: 200,
      headers: {
        "Content-Type": out.contentType,
        "Cache-Control": DRAFT_CACHE_HEADER,
        "X-Waku-Draft": "1",
        "X-Waku-Params-Hash": paramsHash,
      },
    });
  } catch (err) {
    const isTimeout = err instanceof RenderTimeoutError;
    const status = isTimeout ? 504 : 500;
    const code = isTimeout ? "timeout" : "render_failed";
    const message =
      err instanceof Error ? err.message : "Unknown render failure";
    recordRenderLog({
      templateVersionId: tpl.versionId,
      paramsHash,
      format,
      ms: Date.now() - started,
      status,
    });
    finishLog(status, paramsHash, code);
    return errorResponse(
      status,
      isTimeout ? "Render timed out" : "Render failed",
      message,
      format,
    );
  }
}
