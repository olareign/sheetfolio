import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CvDownload } from "./CvDownload";

const html = renderToStaticMarkup(createElement(CvDownload, { slug: "ada", publishedAt: "2026-10-21T10:00:00.000Z" }));

describe("CvDownload", () => {
  it("is one download button with no layout choice for the visitor", () => {
    expect(html).not.toContain("<details");
    expect(html.match(/<a /g)).toHaveLength(1);
    expect(html).toContain('href="/api/cv/ada?v=2026-10-21T10%3A00%3A00.000Z"');
    expect(html).not.toContain("template=");
    expect(html).toContain("Download CV");
  });
});
