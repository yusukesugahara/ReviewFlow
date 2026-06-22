import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: {
    relay: {
      language: "typescript",
      src: "./src",
    },
  },
  reactStrictMode: true,
  output: "standalone",
};

export default nextConfig;
