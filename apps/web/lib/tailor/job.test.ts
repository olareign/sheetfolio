import { describe, expect, it } from "vitest";
import { jobTextFromHtml, JobError, MAX_JOB_CHARS, resolveJob } from "./job";

const LONG =
  "We are hiring a frontend engineer to build fast, accessible interfaces in React and TypeScript for thousands of customers across Africa.";

const page = (body: string, head = "") =>
  `<!doctype html><html><head><title>Job</title>${head}</head><body>${body}</body></html>`;
const html = (h: string) => ({
  fetchImpl: async () => new Response(h, { headers: { "content-type": "text/html" } }),
  guard: async (u: string) => new URL(u),
});

describe("jobTextFromHtml", () => {
  it("uses the structured job posting when the page has one", () => {
    const ld = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: "Frontend Engineer",
      hiringOrganization: { name: "Globex" },
      description: `<p>${LONG}</p><ul><li>React</li><li>TypeScript</li></ul>`,
    });
    const text = jobTextFromHtml(page("<p>cookie banner</p>", `<script type="application/ld+json">${ld}</script>`));
    expect(text).toContain("Job title: Frontend Engineer");
    expect(text).toContain("Company: Globex");
    expect(text).toContain("- React");
    expect(text).not.toContain("cookie banner");
  });

  it("finds a posting inside @graph", () => {
    const ld = JSON.stringify({
      "@graph": [{ "@type": "WebSite" }, { "@type": "JobPosting", title: "Dev", description: LONG }],
    });
    expect(jobTextFromHtml(page("", `<script type="application/ld+json">${ld}</script>`))).toContain(LONG);
  });

  it("ignores broken JSON-LD and reads the page's main text instead", () => {
    const text = jobTextFromHtml(
      page(
        `<nav>Home Jobs</nav><main><h1>Frontend Engineer</h1><p>${LONG}</p></main><footer>Terms</footer>`,
        `<script type="application/ld+json">{nope</script>`,
      ),
    );
    expect(text).toContain("Frontend Engineer");
    expect(text).toContain(LONG);
    expect(text).not.toContain("Home Jobs");
    expect(text).not.toContain("Terms");
  });

  it("drops scripts and styles and decodes entities", () => {
    const text = jobTextFromHtml(page(`<script>var secret=1</script><style>p{}</style><p>Tom &amp; Jerry ${LONG}</p>`));
    expect(text).toContain("Tom & Jerry");
    expect(text).not.toContain("secret");
    expect(text).not.toContain("p{}");
  });
});

describe("resolveJob", () => {
  it("takes pasted text", async () => {
    expect(await resolveJob({ text: `  ${LONG}  ` })).toEqual({ text: LONG });
  });

  it("asks for more when the paste is too short", async () => {
    await expect(resolveJob({ text: "Frontend dev" })).rejects.toMatchObject({ code: "INPUT" });
    await expect(resolveJob({})).rejects.toBeInstanceOf(JobError);
  });

  it("refuses a paste over the limit rather than cutting it silently", async () => {
    await expect(resolveJob({ text: "a ".repeat(MAX_JOB_CHARS) })).rejects.toMatchObject({ code: "INPUT" });
  });

  it("reads a link and reports where it read from", async () => {
    const job = await resolveJob({ url: "https://jobs.example/1" }, html(page(`<main><p>${LONG}</p></main>`)));
    expect(job.text).toContain(LONG);
    expect(job.source).toBe("https://jobs.example/1");
  });

  it("prefers the link when both are given", async () => {
    const job = await resolveJob(
      { url: "https://jobs.example/1", text: "x" },
      html(page(`<main><p>${LONG}</p></main>`)),
    );
    expect(job.source).toBeDefined();
  });

  it("says to paste when the page has no job text", async () => {
    await expect(resolveJob({ url: "https://jobs.example/login" }, html(page("<div>Sign in</div>")))).rejects.toThrow(
      /Paste the job description/,
    );
  });

  it("says to paste when the link cannot be opened", async () => {
    const failing = {
      fetchImpl: async () => new Response("no", { status: 404 }),
      guard: async (u: string) => new URL(u),
    };
    await expect(resolveJob({ url: "https://jobs.example/gone" }, failing)).rejects.toMatchObject({ code: "FETCH" });
  });

  it("refuses a link into a private network", async () => {
    await expect(resolveJob({ url: "http://127.0.0.1/admin" })).rejects.toMatchObject({ code: "FETCH" });
    await expect(resolveJob({ url: "http://169.254.169.254/latest/meta-data" })).rejects.toMatchObject({
      code: "FETCH",
    });
  });

  it("tells the person when a long page was cut", async () => {
    const long = `<main><p>${"word ".repeat(MAX_JOB_CHARS)}</p></main>`;
    const job = await resolveJob({ url: "https://jobs.example/long" }, html(page(long)));
    expect(job.text.length).toBe(MAX_JOB_CHARS);
    expect(job.notice).toMatch(/first part/);
  });
});
