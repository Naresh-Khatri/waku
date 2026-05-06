import { NextResponse, type NextRequest } from "next/server";
import { ProxyError, proxyImage } from "@/lib/proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_HEADER = "public, max-age=86400, s-maxage=604800";

const TRANSPARENT_PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==",
  "base64",
);

const errorPixel = (status: number, code: string) =>
  new Response(new Uint8Array(TRANSPARENT_PIXEL), {
    status,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
      "X-Waku-Proxy-Error": code,
    },
  });

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const target = url.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "missing ?url" }, { status: 400 });
  }

  try {
    const out = await proxyImage(target);
    return new Response(new Uint8Array(out.body), {
      status: 200,
      headers: {
        "Content-Type": out.contentType,
        "Cache-Control": CACHE_HEADER,
      },
    });
  } catch (err) {
    if (err instanceof ProxyError) {
      return errorPixel(err.status, err.code);
    }
    if ((err as { name?: string }).name === "AbortError") {
      return errorPixel(504, "timeout");
    }
    return errorPixel(502, "unknown");
  }
}
