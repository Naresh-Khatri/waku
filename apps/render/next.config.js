import "./env.js";

/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",
  // Renderer uses native modules (resvg-js), so the route runs in the
  // Node.js runtime, not Edge. Keep it explicit at the route level.
  serverExternalPackages: ["@resvg/resvg-js", "sharp"],
  // Standalone tracing under pnpm's symlinked node_modules sometimes misses
  // the platform-specific .node binaries — pull them in explicitly.
  outputFileTracingIncludes: {
    "/r/**": [
      "../../node_modules/.pnpm/@resvg+resvg-js-*/node_modules/@resvg/resvg-js-*/**",
      "../../node_modules/.pnpm/sharp@*/node_modules/sharp/**",
      "../../node_modules/.pnpm/@img+sharp-*/node_modules/@img/**",
    ],
  },
  async headers() {
    return [
      {
        source: "/r/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Accept, Content-Type",
          },
          {
            key: "Access-Control-Expose-Headers",
            value: "X-Waku-Version, X-Waku-Params-Hash, X-Waku-Error",
          },
        ],
      },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default config;
