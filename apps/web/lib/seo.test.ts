import { describe, expect, it } from "vitest";
import { createEmptySite } from "@/content/schemas";
import { jsonLd, pageDescription, personJsonLd } from "./seo";

const site = (over: Record<string, unknown> = {}) => {
  const s = createEmptySite({
    name: "Ada Obi",
    firstName: "Ada",
    headline: "Site Engineer",
    publicEmail: "a@example.com",
    now: new Date(),
  });
  s.profile = { ...s.profile, location: "Lagos, Nigeria", summary: "Builds  things\nacross Lagos.", ...over };
  return s;
};

describe("jsonLd", () => {
  it("cannot be used to close the script tag", () => {
    expect(jsonLd({ name: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});

describe("personJsonLd", () => {
  it("describes the person with the fields a search engine reads", () => {
    expect(personJsonLd(site({ avatar: "https://res.cloudinary.com/x/a.jpg" }), "https://s.example/ada")).toMatchObject(
      {
        "@type": "Person",
        name: "Ada Obi",
        jobTitle: "Site Engineer",
        url: "https://s.example/ada",
        image: "https://res.cloudinary.com/x/a.jpg",
        homeLocation: { name: "Lagos, Nigeria" },
      },
    );
  });

  it("leaves out what the person did not fill in", () => {
    const out = personJsonLd(site({ avatar: undefined, summary: "", location: "" }), "https://s.example/ada");
    expect(out).not.toHaveProperty("image");
    expect(out).not.toHaveProperty("description");
    expect(out).not.toHaveProperty("homeLocation");
  });
});

describe("pageDescription", () => {
  it("uses the summary, flattened and capped at 160 characters", () => {
    expect(pageDescription(site())).toBe("Builds things across Lagos.");
    expect(pageDescription(site({ summary: "x".repeat(400) }))).toHaveLength(160);
  });

  it("falls back to the headline and place", () => {
    expect(pageDescription(site({ summary: "" }))).toBe("Site Engineer based in Lagos, Nigeria.");
  });
});
