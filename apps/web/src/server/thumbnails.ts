import { TRPCError } from "@trpc/server";

import { env } from "@/env";
import { storage } from "@/server/storage";

// Renders a thumbnail for a user template by calling the same render service
// that produces exports. The render service owns @resvg/sharp/satori native
// deps — calling it over HTTP keeps those out of the web bundle and, more
// importantly, guarantees cards match what users actually ship.
//
// Fire-and-forget: callers shouldn't fail their write if the thumbnail render
// fails. Returns the storage key on success, null on failure (logged).
export async function renderUserThumbnail(args: {
  templateId: string;
  versionId: string;
}): Promise<string | null> {
  const { templateId, versionId } = args;
  try {
    const url = new URL(
      `/r/draft/${encodeURIComponent(versionId)}`,
      env.NEXT_PUBLIC_RENDER_BASE_URL,
    );
    url.searchParams.set("format", "png");
    // Small thumbnail width — cards are at most ~600px wide on retina grids.
    url.searchParams.set("w", "640");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `thumbnail render failed: ${res.status}`,
      });
    }
    const body = new Uint8Array(await res.arrayBuffer());

    const key = `templates/${templateId}/thumb.png`;
    const instruction = await storage.getUploadUrl(key, "image/png");
    const upload = await fetch(instruction.url, {
      method: instruction.method,
      headers: instruction.headers,
      body,
    });
    if (!upload.ok) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `thumbnail upload failed: ${upload.status}`,
      });
    }
    return key;
  } catch (err) {
    console.warn(
      `[thumbnails] render failed for template ${templateId}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
