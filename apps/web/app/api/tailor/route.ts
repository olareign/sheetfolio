import { NextResponse } from "next/server";
import { z } from "zod";
import { pickEngine } from "@/content/tailor";
import { recordActivity } from "@/lib/activity";
import { getUserRecord } from "@/lib/accounts";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { groqPoolHasRoom, tailorQuota, takeGroqPoolRun, takeTailorRun } from "@/lib/ratelimit";
import { getDraft } from "@/lib/site";
import { tailorToJob, TailorError } from "@/lib/tailor/ai";
import { JobError, resolveJob } from "@/lib/tailor/job";

/** Claude can take a minute on a long job description. */
export const maxDuration = 120;

const Body = z.object({
  url: z.string().trim().max(2000).optional(),
  text: z.string().max(60_000).optional(),
});

const NO_MORE_TODAY = (limit: number) =>
  `You have used all ${limit} tailorings for today. They come back within 24 hours of each use.`;

const POOL_FULL = "Standard AI has reached today's limit for everyone. It opens up again within 24 hours.";

/**
 * Tailors the signed-in owner's page to a job: given a link or the pasted text, returns a proposed version for them to
 * review. Nothing is saved here, and the page is never changed. Each run costs money, so it is capped per person.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const email = (await auth())?.user?.email?.toLowerCase();
  const account = email ? await getUserRecord(email) : null;
  if (!account) return NextResponse.json({ error: "Sign in again to tailor your CV." }, { status: 401 });
  const keys = env();
  // Pro accounts get Claude when it is switched on; everyone else, and Pro without a Claude key, gets the standard engine.
  const engine = pickEngine(account.plan, {
    claude: Boolean(keys.ANTHROPIC_API_KEY),
    groq: Boolean(keys.GROQ_API_KEY),
  });
  if (!engine) return NextResponse.json({ error: "AI tailoring is not switched on yet." }, { status: 503 });

  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: "Give a link to the job, or paste its description." }, { status: 400 });

  // A look at the allowance first, so a person who has none left is told before anything is fetched.
  const quota = await tailorQuota(engine, account.slug);
  if (!quota)
    return NextResponse.json({ error: "Tailoring is unavailable for a moment. Try again shortly." }, { status: 503 });
  if (quota.remaining <= 0) return NextResponse.json({ error: NO_MORE_TODAY(quota.limit) }, { status: 429 });
  if (engine === "groq") {
    const room = await groqPoolHasRoom(keys.GROQ_DAILY_LIMIT);
    if (room === null)
      return NextResponse.json({ error: "Tailoring is unavailable for a moment. Try again shortly." }, { status: 503 });
    if (!room) return NextResponse.json({ error: POOL_FULL }, { status: 429 });
  }

  const draft = await getDraft(account.slug);
  if (!draft) return NextResponse.json({ error: "We could not find your page." }, { status: 404 });
  if (!draft.experiences.length && !draft.projects.length && !draft.profile.summary.trim()) {
    return NextResponse.json(
      { error: "There is nothing to tailor yet. Add your experience, or start from your CV in the setup guide." },
      { status: 422 },
    );
  }

  try {
    // Reading the link costs nothing, so a bad link does not use up one of today's tailorings.
    const job = await resolveJob(body.data);
    const taken = await takeTailorRun(engine, account.slug);
    if (!taken)
      return NextResponse.json({ error: "Tailoring is unavailable for a moment. Try again shortly." }, { status: 503 });
    if (!taken.allowed) return NextResponse.json({ error: NO_MORE_TODAY(taken.limit) }, { status: 429 });
    if (engine === "groq") {
      const pooled = await takeGroqPoolRun(keys.GROQ_DAILY_LIMIT);
      if (pooled === null)
        return NextResponse.json(
          { error: "Tailoring is unavailable for a moment. Try again shortly." },
          { status: 503 },
        );
      if (!pooled) return NextResponse.json({ error: POOL_FULL }, { status: 429 });
    }

    const result = await tailorToJob(draft, job.text, { engine });
    await recordActivity({
      type: "tailor",
      slug: account.slug,
      detail: `Tailored a CV with ${engine === "claude" ? "Claude" : "standard AI"}`,
    });
    return NextResponse.json({
      result: { ...result, job: { ...result.job, source: job.source, notice: job.notice } },
      quota: { remaining: taken.remaining, limit: taken.limit },
    });
  } catch (err) {
    if (err instanceof JobError)
      return NextResponse.json({ error: err.message }, { status: err.code === "INPUT" ? 400 : 422 });
    if (err instanceof TailorError) {
      const status = err.code === "BUSY" ? 503 : err.code === "NOT_CONFIGURED" ? 503 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error("[tailor] unexpected failure:", err instanceof Error ? err.constructor.name : "unknown");
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
