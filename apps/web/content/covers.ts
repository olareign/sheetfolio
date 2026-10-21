import { type Category, type Project } from "./schemas";

/*
 * Which picture stands for a project, best first: a photo the owner uploaded, then the picture read from the
 * project's website, then a stock photo for its category. Pure, so the card, the project page, the page
 * metadata and the dashboard all agree.
 */

export type CoverKind = "upload" | "preview" | "stock";

export type Cover = { url: string; alt: string; kind: CoverKind };

export const stockPhotoUrl = (category: Category): string => `/stock/projects/${category}.jpg`;

const STOCK_ALT: Record<Category, string> = {
  building: "A tall building with a crane on top, in Lagos",
  road: "Cars driving on a road under construction at sunset",
  "external-works": "A man standing on a pile of bricks at an earth-building site",
  renovation: "A building wrapped in scaffolding",
  community: "Children sitting together outside a community building",
  healthcare: "A woman at a health screening with a doctor",
  institutional: "A white building with a clock tower",
  platform: "People working together at laptops in an office",
  website: "A woman working on a laptop",
  commerce: "A market stall piled with tomatoes",
  fintech: "A shopkeeper in a small shop",
  education: "Pupils in a classroom",
  "data-ai": "A person coding on a laptop",
};

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** The preview only counts while it was read from the link the project has now. */
export function currentPreview(p: Pick<Project, "websiteUrl" | "preview">): NonNullable<Project["preview"]> | undefined {
  return p.websiteUrl && p.preview?.sourceUrl === p.websiteUrl ? p.preview : undefined;
}

export function projectCover(p: Project): Cover {
  const upload = p.images[0];
  if (upload) return { url: upload.url, alt: upload.caption || p.title, kind: "upload" };
  const preview = currentPreview(p);
  if (preview?.image) {
    return { url: preview.image, alt: `${p.title}, ${hostOf(preview.sourceUrl)}`, kind: "preview" };
  }
  return { url: stockPhotoUrl(p.category), alt: STOCK_ALT[p.category], kind: "stock" };
}

/** True when the owner still has something to add: no photo of their own and nothing read from a website. */
export function needsCover(p: Project): boolean {
  return projectCover(p).kind === "stock";
}
