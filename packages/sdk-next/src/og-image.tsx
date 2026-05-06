/**
 * Convenience server component to render a Waku image inline.
 *
 *   <OgImage user="naresh" template="big-title" params={{ title: "Hi" }} />
 */
import * as React from "react";

import { buildOgUrl, type BuildOgUrlOptions } from "@waku/sdk-core";

type Props<P extends Record<string, unknown>> = BuildOgUrlOptions<P> & {
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
};

export function OgImage<P extends Record<string, unknown>>({
  alt,
  width = 1200,
  height = 630,
  className,
  style,
  ...rest
}: Props<P>): React.JSX.Element {
  const src = buildOgUrl(rest);
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
      style={style}
    />
  );
}
