import { describe, expect, it } from "vitest";
import { CATEGORIES, type Project } from "./schemas";
import { currentPreview, hostOf, needsCover, projectCover, stockPhotoUrl } from "./covers";

const base: Project = {
  id: "p",
  title: "Geriatric Centre",
  location: "Surulere",
  category: "healthcare",
  role: "Site Engineer",
  scope: "",
  startYear: 2024,
  status: "completed",
  images: [],
  featured: false,
};
const preview = (over = {}) => ({
  sourceUrl: "https://www.acme.test/",
  image: "https://blob.test/p.png",
  imageSource: "og" as const,
  fetchedAt: "2026-10-22T10:00:00.000Z",
  ...over,
});

describe("projectCover", () => {
  it("prefers the owner's own photo", () => {
    const p = { ...base, websiteUrl: "https://www.acme.test/", preview: preview(), images: [{ url: "https://blob.test/mine.jpg", caption: "Front", isCover: true }] };
    expect(projectCover(p)).toEqual({ url: "https://blob.test/mine.jpg", alt: "Front", kind: "upload" });
  });

  it("uses the website picture when there is no photo", () => {
    const p = { ...base, websiteUrl: "https://www.acme.test/", preview: preview() };
    expect(projectCover(p)).toEqual({ url: "https://blob.test/p.png", alt: "Geriatric Centre, acme.test", kind: "preview" });
  });

  it("ignores a preview read from a different link", () => {
    const p = { ...base, websiteUrl: "https://new.test/", preview: preview() };
    expect(currentPreview(p)).toBeUndefined();
    expect(projectCover(p).kind).toBe("stock");
  });

  it("ignores a preview once the link is removed", () => {
    expect(projectCover({ ...base, preview: preview() }).kind).toBe("stock");
  });

  it("falls back to a stock photo for the category, and needs a cover", () => {
    expect(projectCover(base)).toMatchObject({ url: "/stock/projects/healthcare.jpg", kind: "stock" });
    expect(needsCover(base)).toBe(true);
    expect(needsCover({ ...base, images: [{ url: "https://blob.test/a.jpg", isCover: true }] })).toBe(false);
  });

  it("has a stock photo and alt text for every category", () => {
    for (const c of CATEGORIES) {
      const cover = projectCover({ ...base, category: c });
      expect(cover.url).toBe(stockPhotoUrl(c));
      expect(cover.alt.length).toBeGreaterThan(5);
    }
  });
});

describe("hostOf", () => {
  it("drops www and keeps odd input readable", () => {
    expect(hostOf("https://www.acme.test/x")).toBe("acme.test");
    expect(hostOf("nonsense")).toBe("nonsense");
  });
});
