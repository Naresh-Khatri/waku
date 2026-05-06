import "server-only";

import { env } from "@/env";

import { fsStorage } from "./fs";
import type { StorageAdapter } from "./types";

const r2Stub: StorageAdapter = {
  async getUploadUrl() {
    throw new Error("R2 storage adapter not implemented yet");
  },
  getReadUrl() {
    throw new Error("R2 storage adapter not implemented yet");
  },
  async head() {
    throw new Error("R2 storage adapter not implemented yet");
  },
};

export const storage: StorageAdapter =
  env.WAKU_STORAGE === "r2" ? r2Stub : fsStorage;

export type { StorageAdapter, UploadInstruction, HeadResult } from "./types";
