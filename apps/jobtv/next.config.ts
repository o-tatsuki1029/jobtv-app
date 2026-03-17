import type { NextConfig } from "next";
import { ALLOWED_IMAGE_HOSTS } from "./constants/site";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    turbopackUseSystemTlsCerts: true,
    serverActions: {
      // 動画はPresigned URLでS3に直接アップロードするため、サムネイル用に10MBで十分
      bodySizeLimit: 10 * 1024 * 1024 // 10MB in bytes
    },
    proxyClientMaxBodySize: 10 * 1024 * 1024 // 10MB in bytes
  },
  images: {
    remotePatterns: ALLOWED_IMAGE_HOSTS.map((hostname) => ({
      protocol: "https" as const,
      hostname
    })),
    // 開発環境のZeroTrustで制限されているためオフにする
    unoptimized: process.env.NODE_ENV === "development"
  }
};

export default nextConfig;
