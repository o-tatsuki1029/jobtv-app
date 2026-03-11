import type { NextConfig } from "next";
import { ALLOWED_IMAGE_HOSTS } from "./constants/site";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    turbopackUseSystemTlsCerts: true,
    serverActions: {
      // ヒーロー動画アップロードに対応するため、ボディサイズ上限を500MBに設定
      bodySizeLimit: 500 * 1024 * 1024 // 500MB in bytes
    },
    // Middleware（proxy.ts）でのリクエストボディサイズ上限を500MBに設定
    proxyClientMaxBodySize: 500 * 1024 * 1024 // 500MB in bytes
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
