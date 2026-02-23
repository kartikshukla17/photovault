import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["picsum.photos", "photo--vault.s3.eu-north-1.amazonaws.com"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "photo--vault.s3.eu-north-1.amazonaws.com",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    unoptimized: true,
  },
};

export default nextConfig;
