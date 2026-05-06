import "server-only";

import { stat } from "node:fs/promises";
import { join, resolve } from "node:path";

import { env } from "@/env";

import { sign } from "./sign";
import type { HeadResult, StorageAdapter, UploadInstruction } from "./types";

const UPLOAD_TTL_MS = 10 * 60 * 1000;

const root = resolve(process.cwd(), env.WAKU_STORAGE_DIR);

const safeJoin = (key: string): string => {
  const target = resolve(root, key);
  if (!target.startsWith(root + "/") && target !== root) {
    throw new Error("invalid storage key");
  }
  return target;
};

const guessMime = (path: string): string => {
  const ext = path.toLowerCase().split(".").pop() ?? "";
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

export const fsStorage: StorageAdapter = {
  async getUploadUrl(key, mime): Promise<UploadInstruction> {
    const expiresAt = Date.now() + UPLOAD_TTL_MS;
    const sig = sign(
      env.WAKU_STORAGE_SECRET,
      `upload:${key}:${mime}:${expiresAt}`,
    );
    const url = new URL("/api/storage/upload", env.WAKU_STORAGE_BASE_URL);
    url.searchParams.set("key", key);
    url.searchParams.set("mime", mime);
    url.searchParams.set("exp", String(expiresAt));
    url.searchParams.set("sig", sig);
    return {
      url: url.toString(),
      method: "PUT",
      headers: { "Content-Type": mime },
      expiresAt,
    };
  },

  getReadUrl(key) {
    const url = new URL("/api/storage/read", env.WAKU_STORAGE_BASE_URL);
    url.searchParams.set("key", key);
    return url.toString();
  },

  async head(key): Promise<HeadResult> {
    try {
      const path = safeJoin(key);
      const s = await stat(path);
      if (!s.isFile()) return null;
      return { bytes: s.size, mime: guessMime(key) };
    } catch {
      return null;
    }
  },
};

export const fsRoot = root;
export const fsKeyPath = (key: string): string => safeJoin(key);
export { join as fsJoin };
