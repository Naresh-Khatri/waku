export type UploadInstruction = {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresAt: number;
};

export type HeadResult = {
  bytes: number;
  mime: string;
} | null;

export interface StorageAdapter {
  getUploadUrl(key: string, mime: string): Promise<UploadInstruction>;
  getReadUrl(key: string): string;
  head(key: string): Promise<HeadResult>;
  /** Best-effort batched delete. Used by the anon-cleanup cron. */
  delete(keys: string[]): Promise<void>;
}
