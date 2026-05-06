import { NextResponse, type NextRequest } from "next/server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";

import { env } from "@/env";
import { fsKeyPath } from "@/server/storage/fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const guessMime = (key: string): string => {
  const ext = key.toLowerCase().split(".").pop() ?? "";
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
};

export async function GET(req: NextRequest) {
  if (env.WAKU_STORAGE !== "fs") {
    return NextResponse.json({ error: "fs storage disabled" }, { status: 400 });
  }
  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "missing key" }, { status: 400 });

  let path: string;
  try {
    path = fsKeyPath(key);
  } catch {
    return NextResponse.json({ error: "bad key" }, { status: 400 });
  }

  let s;
  try {
    s = await stat(path);
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!s.isFile()) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const stream = Readable.toWeb(createReadStream(path)) as ReadableStream;
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": guessMime(key),
      "Content-Length": String(s.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
