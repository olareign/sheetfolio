import "server-only";
import { TailorError } from "./errors";

/*
 * The standard engine: Groq's OpenAI-compatible chat endpoint, asked for strict JSON. Plain `fetch` rather than an SDK,
 * because one request shape is all we need. Nothing the person wrote is ever logged here, only the kind of failure.
 */

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const TIMEOUT_MS = 60_000;
/** A busy-minute rejection comes back with how long to wait; wait once if it is short, otherwise give up. */
const MAX_RETRY_WAIT_MS = 8_000;
/**
 * Groq counts the room reserved for the answer against its per-minute token allowance, so ask for no more than a
 * tailored CV needs.
 */
const MAX_OUTPUT_TOKENS = 3_500;

export type GroqRequest = {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  /** JSON Schema of the answer; every property required and `additionalProperties: false` (strict mode). */
  schema: Record<string, unknown>;
};

export type GroqDeps = {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

type Completion = {
  choices?: { finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }[];
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Seconds to wait from a `retry-after` header, or null when it is missing or not a number. */
function retryAfterMs(response: Response): number | null {
  const seconds = Number(response.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
}

/** Asks the model and returns its answer parsed as JSON, unchecked. Throws `TailorError` with a message safe to show. */
export async function groqStructured(req: GroqRequest, deps: GroqDeps = {}): Promise<unknown> {
  const send = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? wait;
  const body = JSON.stringify({
    model: req.model,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.user },
    ],
    response_format: { type: "json_schema", json_schema: { name: "cv_tailoring", strict: true, schema: req.schema } },
    temperature: 0.3,
    max_completion_tokens: MAX_OUTPUT_TOKENS,
    // Only the gpt-oss models take this; keeping the thinking short keeps a run inside the per-minute allowance.
    ...(req.model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
  });

  let response: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await send(ENDPOINT, {
        method: "POST",
        headers: { authorization: `Bearer ${req.apiKey}`, "content-type": "application/json" },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (err) {
      console.error("[tailor] groq unreachable:", err instanceof Error ? err.name : "unknown");
      throw new TailorError("BUSY", "The AI is busy right now. Try again in a minute.");
    }
    const pause = response.status === 429 ? retryAfterMs(response) : null;
    if (pause === null || pause > MAX_RETRY_WAIT_MS || attempt === 1) break;
    await sleep(pause);
  }
  const res = response!;

  if (!res.ok) {
    console.error("[tailor] groq answered", res.status);
    if (res.status === 401 || res.status === 403) {
      throw new TailorError("NOT_CONFIGURED", "AI tailoring is not available right now.");
    }
    if (res.status === 429 || res.status >= 500) {
      throw new TailorError("BUSY", "The AI is busy right now. Try again in a minute.");
    }
    if (res.status === 413) {
      throw new TailorError(
        "BAD_OUTPUT",
        "That page and job description are too long for standard AI. Paste a shorter job description.",
      );
    }
    throw new TailorError("UPSTREAM", "Something went wrong while tailoring. Try again.");
  }

  const data = (await res.json().catch(() => null)) as Completion | null;
  const choice = data?.choices?.[0];
  if (choice?.message?.refusal) {
    throw new TailorError("REFUSED", "The AI could not work with that job description. Try pasting a different one.");
  }
  if (choice?.finish_reason === "length") {
    throw new TailorError("BAD_OUTPUT", "The result was cut off. Try again, or paste a shorter job description.");
  }
  const content = choice?.message?.content;
  if (!content) throw new TailorError("BAD_OUTPUT", "We could not read the AI's answer. Try again.");
  try {
    return JSON.parse(content);
  } catch {
    throw new TailorError("BAD_OUTPUT", "We could not read the AI's answer. Try again.");
  }
}
