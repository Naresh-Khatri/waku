import "server-only";

import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/env";

import type { HeadResult, StorageAdapter, UploadInstruction } from "./types";

const UPLOAD_TTL_SEC = 10 * 60;

const globalForS3 = globalThis as unknown as { s3?: S3Client };

const getClient = (): S3Client => {
  if (!globalForS3.s3) {
    globalForS3.s3 = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return globalForS3.s3;
};

export const storage: StorageAdapter = {
  async getUploadUrl(key, mime): Promise<UploadInstruction> {
    const cmd = new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      ContentType: mime,
    });
    const url = await getSignedUrl(getClient(), cmd, {
      expiresIn: UPLOAD_TTL_SEC,
    });
    return {
      url,
      method: "PUT",
      headers: { "Content-Type": mime },
      expiresAt: Date.now() + UPLOAD_TTL_SEC * 1000,
    };
  },

  getReadUrl(key) {
    return `${env.R2_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  },

  async head(key): Promise<HeadResult> {
    try {
      const out = await getClient().send(
        new HeadObjectCommand({ Bucket: env.R2_BUCKET, Key: key }),
      );
      return {
        bytes: out.ContentLength ?? 0,
        mime: out.ContentType ?? "application/octet-stream",
      };
    } catch {
      return null;
    }
  },
};

export type { StorageAdapter, UploadInstruction, HeadResult } from "./types";
