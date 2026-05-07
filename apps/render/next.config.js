import "./env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Renderer uses native modules (resvg-js), so the route runs in the
  // Node.js runtime, not Edge. Keep it explicit at the route level.
  serverExternalPackages: ["@resvg/resvg-js", "sharp"],
  async headers() {
    return [
      {
        source: "/r/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Accept, Content-Type" },
          { key: "Access-Control-Expose-Headers", value: "X-Waku-Version, X-Waku-Params-Hash, X-Waku-Error" },
        ],
      },
    ];
  },
};

export default config;
