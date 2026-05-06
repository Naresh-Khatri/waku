import { NextResponse, type NextRequest } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { env } from "@/env";
import { fsKeyPath } from "@/server/storage/fs";
import { verify } from "@/server/storage/sign";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

export async function PUT(req: NextRequest) {
  if (env.WAKU_STORAGE !== "fs") {
    return NextResponse.json({ error: "uploads disabled" }, { status: 400 });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const mime = url.searchParams.get("mime");
  const exp = url.searchParams.get("exp");
  const sig = url.searchParams.get("sig");

  if (!key || !mime || !exp || !sig) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }
  if (Number(exp) < Date.now()) {
    return NextResponse.json({ error: "url expired" }, { status: 410 });
  }
  if (!verify(env.WAKU_STORAGE_SECRET, `upload:${key}:${mime}:${exp}`, sig)) {
    return NextResponse.json({ error: "bad signature" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.startsWith(mime.split(";")[0] ?? mime)) {
    return NextResponse.json({ error: "content-type mismatch" }, { status: 400 });
  }

  const body = await req.arrayBuffer();
  if (body.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "too large" }, { status: 413 });
  }

  let path: string;
  try {
    path = fsKeyPath(key);
  } catch {
    return NextResponse.json({ error: "bad key" }, { status: 400 });
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, Buffer.from(body));

  return NextResponse.json({ ok: true, bytes: body.byteLength });
}
