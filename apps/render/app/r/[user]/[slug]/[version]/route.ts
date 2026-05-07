import { NextResponse, type NextRequest } from "next/server";
import type { RenderFormat } from "@waku/renderer";
import {
  loadTemplateVersion,
  resolvePublishedVersion,
} from "@/lib/db";
import { logRender } from "@/lib/observability";
import { negotiateFormat } from "@/lib/format";
import { renderErrorImage } from "@/lib/error-image";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

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

  const ipKey = `ip:${getClientIp(req)}`;
  const ownerKey = `user:${user}`;
  const userLimit = checkRateLimit(ownerKey);
  const ipLimit = userLimit.ok ? checkRateLimit(ipKey) : userLimit;
  if (!userLimit.ok || !ipLimit.ok) {
    const limit = userLimit.ok ? ipLimit : userLimit;
    const retryAfter = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000));
    finishLog(429, "", -1, "rate_limited");
    try {
      const out = await renderErrorImage(
        "Rate limit reached",
        `Free tier: ${limit.limit} renders/day. Resets in ${Math.ceil(retryAfter / 60)}m.`,
        format,
      );
      return new Response(new Uint8Array(out.buffer), {
        status: 429,
        headers: {
          "Content-Type": out.contentType,
          "Cache-Control": "no-store",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(limit.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(limit.resetAt / 1000)),
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Rate limit reached" },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }
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

  // Render pipeline is being rewritten for the flat editor document
  // shape. Return 501 until the new renderer lands.
  finishLog(501, "", version, "renderer_not_implemented");
  return errorResponse(
    501,
    "Renderer rewrite in progress",
    `${user}/${slug}@${version}: flat-document renderer is a follow-up to the editor migration`,
    format,
  );
}
