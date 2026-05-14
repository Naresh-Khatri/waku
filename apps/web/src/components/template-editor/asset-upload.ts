import { api } from "@/trpc/react";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const MAX_BYTES = 10 * 1024 * 1024;

export class AssetUploadError extends Error {}

type AllowedMime =
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "image/gif"
  | "image/svg+xml";

const sanitize = (name: string): string => {
  const clean = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return clean.length > 0 ? clean : "upload";
};

export function useAssetUploader() {
  const utils = api.useUtils();
  const getUploadUrl = api.asset.getUploadUrl.useMutation();
  const confirmAsset = api.asset.confirm.useMutation();

  const upload = async (
    file: File,
    kind: "image" | "logo" | "background" = "image",
  ): Promise<{ readUrl: string; assetId: string }> => {
    if (!ALLOWED_MIME.has(file.type)) {
      throw new AssetUploadError(
        `Unsupported file type ${file.type || "unknown"}`,
      );
    }
    if (file.size > MAX_BYTES) {
      throw new AssetUploadError("File exceeds 10 MB limit");
    }

    const { assetId, storageKey, upload: instr } =
      await getUploadUrl.mutateAsync({
        kind,
        filename: sanitize(file.name),
        mime: file.type as AllowedMime,
      });

    const put = await fetch(instr.url, {
      method: instr.method,
      headers: instr.headers,
      body: file,
    });
    if (!put.ok) {
      throw new AssetUploadError(`Upload failed (${put.status})`);
    }

    const row = await confirmAsset.mutateAsync({
      assetId,
      storageKey,
      kind,
    });

    void utils.asset.list.invalidate();

    return { readUrl: row.readUrl, assetId };
  };

  return {
    upload,
    isUploading: getUploadUrl.isPending || confirmAsset.isPending,
  };
}
