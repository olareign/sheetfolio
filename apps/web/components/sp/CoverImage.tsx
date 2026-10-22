import Image from "next/image";
import type { Cover } from "@/content/covers";

/** Our own files and Cloudinary uploads go through the image optimiser; a site's own picture linked directly does not. */
function optimisable(url: string): boolean {
  if (url.startsWith("/")) return true;
  try {
    return new URL(url).hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

export function CoverImage({ cover, sizes, priority }: { cover: Cover; sizes: string; priority?: boolean }) {
  return <Image src={cover.url} alt={cover.alt} fill sizes={sizes} priority={priority} unoptimized={!optimisable(cover.url)} />;
}
