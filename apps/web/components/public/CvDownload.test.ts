import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CvDownload } from "./CvDownload";

const render = (templates: Parameters<typeof CvDownload>[0]["templates"]) =>
  renderToStaticMarkup(createElement(CvDownload, { slug: "ada", publishedAt: "2026-10-21T10:00:00.000Z", templates }));

describe("CvDownload", () => {
  it("is a plain download button when the owner offers a single layout", () => {
    const html = render(["classic"]);
    expect(html).not.toContain("<details");
    expect(html).toContain('href="/api/cv/ada?v=2026-10-21T10%3A00%3A00.000Z&amp;template=classic"');
    expect(html).toContain("Download CV");
  });

  it("opens a list of exactly the offered layouts, default first and marked", () => {
    const html = render(["minimal", "classic"]);
    expect(html).toContain("<details");
    expect(html.indexOf("template=minimal")).toBeLessThan(html.indexOf("template=classic"));
    expect(html).not.toContain("template=modern");
    expect(html).not.toContain("template=projects");
    expect(html.match(/Default/g)).toHaveLength(1);
    expect(html.indexOf("Default")).toBeLessThan(html.indexOf("template=classic"));
  });

  it("renders every layout as a download link when all four are offered", () => {
    const html = render(["modern", "classic", "projects", "minimal"]);
    expect(html.match(/<a /g)).toHaveLength(4);
    expect(html.match(/ download/g)).toHaveLength(4);
  });

  it("renders nothing when no layout is offered", () => {
    expect(render([])).toBe("");
  });
});
