import type { NextConfig } from "next";

// Cross-origin isolation headers enable SharedArrayBuffer, which ffmpeg.wasm
// (multi-threaded core) needs to run. These must be set on the document
// response for `self.crossOriginIsolated` to be true.
const crossOriginIsolationHeaders = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
];

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["*.space-z.ai"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: crossOriginIsolationHeaders,
      },
    ];
  },
};

export default nextConfig;
