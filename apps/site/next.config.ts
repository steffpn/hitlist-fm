import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.scdn.co" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "**.deezer.com" },
    ],
  },
};

export default nextConfig;
