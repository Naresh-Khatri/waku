/**
 * @waku/sdk-next — Next.js metadata helpers for Waku image templates.
 */

import {
  buildOgUrl,
  ogImageMetadata,
  type BuildOgUrlOptions,
  type OgImageMetadata,
} from "@waku/sdk-core";

export { buildOgUrl, ogImageMetadata } from "@waku/sdk-core";
export type {
  BuildOgUrlOptions,
  Format,
  OgImageMetadata,
} from "@waku/sdk-core";

type Defaults = {
  baseUrl?: string;
  user?: string;
};

/**
 * Resolve defaults from env if available.
 *   WAKU_BASE_URL → baseUrl
 *   WAKU_USER     → user
 */
function readDefaults(): Defaults {
  const g = globalThis as { process?: { env?: Record<string, string | undefined> } };
  const env = g.process?.env ?? {};
  return {
    baseUrl: env.WAKU_BASE_URL ?? env.OG_BASE_URL,
    user: env.WAKU_USER ?? env.OG_USER,
  };
}

type CreateOgMetadataInput<P extends Record<string, unknown>> = Omit<
  BuildOgUrlOptions<P>,
  "user" | "baseUrl"
> & {
  user?: string;
  baseUrl?: string;
  width?: number;
  height?: number;
  alt?: string;
  twitterCard?: "summary_large_image" | "summary";
};

type NextOgMetadata = {
  openGraph: {
    images: [OgImageMetadata];
  };
  twitter: {
    card: "summary_large_image" | "summary";
    images: [OgImageMetadata];
  };
};

/**
 * Build the `metadata.openGraph` + `metadata.twitter` blocks for a Next.js
 * page. Drop the result into your `metadata` export.
 *
 *   export const metadata = createOgMetadata({
 *     template: "big-title",
 *     params: { title: "Hello world" },
 *   });
 */
export function createOgMetadata<P extends Record<string, unknown>>(
  input: CreateOgMetadataInput<P>,
): NextOgMetadata {
  const defaults = readDefaults();
  const user = input.user ?? defaults.user;
  if (!user) {
    throw new Error(
      "createOgMetadata: `user` is required (or set WAKU_USER env var)",
    );
  }
  const image = ogImageMetadata({
    ...input,
    user,
    baseUrl: input.baseUrl ?? defaults.baseUrl,
  });
  return {
    openGraph: { images: [image] },
    twitter: {
      card: input.twitterCard ?? "summary_large_image",
      images: [image],
    },
  };
}

export const SDK_NEXT_VERSION = "0.1.0";
