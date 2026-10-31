import type { NextConfig } from "next";

// CLOUDINARY_URL is cloudinary://<key>:<secret>@<cloud_name>; only the public cloud name is used here.
const cloudName = /@([A-Za-z0-9_-]+)\/?$/.exec(process.env.CLOUDINARY_URL?.trim() ?? "")?.[1];

/** The address the product lives at. The project's *.vercel.app aliases still answer, so they are sent here. */
const HOME = "https://dosinex.com";
const OLD_HOSTS = ["sheetfolio.vercel.app", "dosinex.vercel.app"];

const nextConfig: NextConfig = {
  redirects: async () => [
    // Anyone arriving on an old address lands on the same page at dosinex.com. The daily stats job is left alone because
    // Vercel's cron does not follow redirects.
    ...OLD_HOSTS.map((host) => ({
      source: "/:path((?!api/cron/).*)",
      has: [{ type: "host" as const, value: host }],
      destination: `${HOME}/:path`,
      permanent: true,
    })),
    // The Examples page became Featured, and Stories became Use cases; keep old links working.
    { source: "/examples", destination: "/featured", permanent: true },
    { source: "/stories", destination: "/use-cases", permanent: true },
    // Pricing is hidden until plans are settled (temporary, so search engines do not drop the address for good).
    { source: "/pricing", destination: "/", permanent: false },
  ],
  // The CV renderer reads its fonts from disk at request time, which file tracing cannot see.
  outputFileTracingIncludes: { "/api/cv/[slug]": ["./lib/fonts/**/*"] },
  images: {
    // Site photos and certificate scans live in Cloudinary, under this account's own path only.
    remotePatterns: cloudName
      ? [{ protocol: "https", hostname: "res.cloudinary.com", pathname: `/${cloudName}/**` }]
      : [],
  },
};

export default nextConfig;
