import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Site photos and certificate scans live in Vercel Blob.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
};

export default nextConfig;
