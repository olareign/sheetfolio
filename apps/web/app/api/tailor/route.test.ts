import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptySite, Site } from "@/content/schemas";
import { finishTailoring, type AiTailoring } from "@/content/tailor";

const base = createEmptySite({
  name: "Ada Obi",
  firstName: "Ada",
  headline: "Software Engineer",
  publicEmail: "ada@example.com",
  now: new Date("2026-10-01T10:00:00.000Z"),
});
const filled = Site.parse({
  ...base,
  profile: { ...base.profile, summary: "Builds web products." },
  experiences: [{ id: "e1", company: "Acme", role: "Frontend Engineer", startYear: 2022, notes: "Built it." }],
});

const state = vi.hoisted(() => ({
  email: "ada@example.com" as string | null,
  slug: "ada-obi" as string | null,
  key: "sk-ant-test" as string | undefined,
  remaining: 5,
  allowed: true,
  quotaDown: false,
  draft: null as unknown,
  tailor: vi.fn(),
  resolve: vi.fn(),
  taken: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: async () => (state.email ? { user: { email: state.email } } : null) }));
vi.mock("@/lib/accounts", () => ({ getUserRecord: async () => (state.slug ? { slug: state.slug } : null) }));
vi.mock("@/lib/env", () => ({ env: () => ({ ANTHROPIC_API_KEY: state.key }) }));
vi.mock("@/lib/ratelimit", () => ({
  tailorQuota: async () => (state.quotaDown ? null : { remaining: state.remaining, limit: 5 }),
  takeTailorRun: async () => {
    state.taken();
    return state.quotaDown ? null : { allowed: state.allowed, remaining: Math.max(0, state.remaining - 1), limit: 5 };
  },
}));
vi.mock("@/lib/site", () => ({ getDraft: async () => state.draft }));
vi.mock("@/lib/tailor/job", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tailor/job")>()),
  resolveJob: state.resolve,
}));
vi.mock("@/lib/tailor/ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/tailor/ai")>()),
  tailorToJob: state.tailor,
}));

const { POST } = await import("./route");
const { JobError } = await import("@/lib/tailor/job");
const { TailorError } = await import("@/lib/tailor/ai");

const post = (body: unknown) =>
  POST(new Request("https://dosinex.example/api/tailor", { method: "POST", body: JSON.stringify(body) }));
const ai: AiTailoring = {
  job: { title: "Frontend Developer", company: "Globex" },
  headline: "Frontend Engineer",
  summary: "Builds fast interfaces.",
  competencies: ["React"],
  experiences: [{ id: "e1", notes: "Built it." }],
  projects: [],
  certifications: [],
  matched: ["React"],
  gaps: [],
};

beforeEach(() => {
  Object.assign(state, {
    email: "ada@example.com",
    slug: "ada-obi",
    key: "sk-ant-test",
    remaining: 5,
    allowed: true,
    quotaDown: false,
    draft: filled,
  });
  state.tailor.mockReset().mockResolvedValue(finishTailoring(filled, ai));
  state.resolve.mockReset().mockResolvedValue({ text: "job text", source: "https://jobs.example/1" });
  state.taken.mockReset();
});

describe("POST /api/tailor", () => {
  it("returns a proposed version and what is left of today's allowance", async () => {
    const res = await post({ url: "https://jobs.example/1" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result.job).toMatchObject({
      title: "Frontend Developer",
      company: "Globex",
      source: "https://jobs.example/1",
    });
    expect(json.result.overlay.headline).toBe("Frontend Engineer");
    expect(json.quota).toEqual({ remaining: 4, limit: 5 });
  });

  it("needs a signed-in owner", async () => {
    state.email = null;
    expect((await post({ text: "x" })).status).toBe(401);
    state.email = "ada@example.com";
    state.slug = null;
    expect((await post({ text: "x" })).status).toBe(401);
  });

  it("says so when no key is set, without using anything up", async () => {
    state.key = undefined;
    expect((await post({ text: "x" })).status).toBe(503);
    expect(state.taken).not.toHaveBeenCalled();
  });

  it("stops at the daily cap before reading the link or calling the AI", async () => {
    state.remaining = 0;
    const res = await post({ url: "https://jobs.example/1" });
    expect(res.status).toBe(429);
    expect(state.resolve).not.toHaveBeenCalled();
    expect(state.tailor).not.toHaveBeenCalled();
  });

  it("refuses when the allowance cannot be read, rather than running for free", async () => {
    state.quotaDown = true;
    expect((await post({ text: "x" })).status).toBe(503);
    expect(state.tailor).not.toHaveBeenCalled();
  });

  it("does not use up a tailoring on a link that cannot be read", async () => {
    state.resolve.mockRejectedValue(
      new JobError("FETCH", "We couldn't open that link. Paste the job description instead."),
    );
    const res = await post({ url: "https://jobs.example/login" });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/Paste the job description/);
    expect(state.taken).not.toHaveBeenCalled();
  });

  it("asks for a job when neither a link nor text is given", async () => {
    state.resolve.mockRejectedValue(new JobError("INPUT", "Paste the whole job description, or give a link to it."));
    expect((await post({})).status).toBe(400);
    expect((await post("nope")).status).toBe(400);
  });

  it("does not run when two requests race for the last tailoring", async () => {
    state.allowed = false;
    expect((await post({ text: "x" })).status).toBe(429);
    expect(state.tailor).not.toHaveBeenCalled();
  });

  it("has nothing to tailor on an empty page", async () => {
    state.draft = base;
    const res = await post({ text: "x" });
    expect(res.status).toBe(422);
    expect(state.taken).not.toHaveBeenCalled();
  });

  it("turns the AI's failures into messages", async () => {
    state.tailor.mockRejectedValue(new TailorError("BUSY", "The AI is busy right now. Try again in a minute."));
    const res = await post({ text: "x" });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/busy/);
    state.tailor.mockRejectedValue(new TailorError("REFUSED", "The AI could not work with that job description."));
    expect((await post({ text: "x" })).status).toBe(502);
  });
});
