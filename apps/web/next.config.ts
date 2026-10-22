import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Examples page became Featured; keep old links working.
  redirects: async () => [{ source: "/examples", destination: "/featured", permanent: true }],
  // The CV renderer reads its fonts from disk at request time, which file tracing cannot see.
  outputFileTracingIncludes: { "/api/cv/[slug]": ["./lib/fonts/**/*"] },
  images: {
    // Site photos and certificate scans live in Vercel Blob.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
};

export default nextConfig;
