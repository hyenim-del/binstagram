import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false, // 개발 서버의 "N" 배지가 휴대폰 하단 바를 가려서 끔(2026-09-05)
};
export default nextConfig;
