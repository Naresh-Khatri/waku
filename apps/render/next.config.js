/** @type {import("next").NextConfig} */
const config = {
  // Renderer uses native modules (resvg-js), so the route runs in the
  // Node.js runtime, not Edge. Keep it explicit at the route level.
  serverExternalPackages: ["@resvg/resvg-js"],
};

export default config;
