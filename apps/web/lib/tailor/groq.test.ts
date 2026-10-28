import { beforeEach, describe, expect, it, vi } from "vitest";
import { groqStructured, type GroqRequest } from "./groq";

const req: GroqRequest = {
  apiKey: "gsk_test",
  model: "openai/gpt-oss-120b",
  system: "system",
  user: "user",
  schema: { type: "object" },
};

const ok = (content: string, finish = "stop") =>
  new Response(JSON.stringify({ choices: [{ finish_reason: finish, message: { content } }] }), { status: 200 });

const send = vi.fn();
const sleep = vi.fn(async () => {});
const deps = { fetch: send as unknown as typeof fetch, sleep };
beforeEach(() => {
  send.mockReset();
  sleep.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("groqStructured", () => {
  it("returns the parsed JSON of the answer", async () => {
    send.mockResolvedValue(ok('{"a":1}'));
    expect(await groqStructured(req, deps)).toEqual({ a: 1 });
  });

  it("asks for low reasoning only from the gpt-oss models", async () => {
    send.mockImplementation(async () => ok("{}"));
    await groqStructured(req, deps);
    await groqStructured({ ...req, model: "qwen/qwen3.8-27b" }, deps);
    expect(JSON.parse(send.mock.calls[0]![1].body).reasoning_effort).toBe("low");
    expect(JSON.parse(send.mock.calls[1]![1].body).reasoning_effort).toBeUndefined();
  });

  it("waits once for a short busy-minute and tries again", async () => {
    send.mockResolvedValueOnce(new Response("", { status: 429, headers: { "retry-after": "2" } }));
    send.mockResolvedValueOnce(ok('{"a":1}'));
    expect(await groqStructured(req, deps)).toEqual({ a: 1 });
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it("does not wait for a long one, and says the AI is busy", async () => {
    send.mockResolvedValue(new Response("", { status: 429, headers: { "retry-after": "600" } }));
    await expect(groqStructured(req, deps)).rejects.toMatchObject({ code: "BUSY" });
    expect(sleep).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("gives up after one retry", async () => {
    send.mockResolvedValue(new Response("", { status: 429, headers: { "retry-after": "1" } }));
    await expect(groqStructured(req, deps)).rejects.toMatchObject({ code: "BUSY" });
    expect(send).toHaveBeenCalledTimes(2);
  });

  it.each([
    [401, "NOT_CONFIGURED"],
    [403, "NOT_CONFIGURED"],
    [413, "BAD_OUTPUT"],
    [500, "BUSY"],
    [503, "BUSY"],
    [400, "UPSTREAM"],
  ])("maps a %i answer to %s", async (status, code) => {
    send.mockResolvedValue(new Response("", { status }));
    await expect(groqStructured(req, deps)).rejects.toMatchObject({ code });
  });

  it("says the AI is busy when Groq cannot be reached", async () => {
    send.mockRejectedValue(new TypeError("fetch failed"));
    await expect(groqStructured(req, deps)).rejects.toMatchObject({ code: "BUSY" });
  });

  it("does not use an answer that was cut off", async () => {
    send.mockResolvedValue(ok('{"a":', "length"));
    await expect(groqStructured(req, deps)).rejects.toMatchObject({ code: "BAD_OUTPUT" });
  });

  it("reports a refusal, an empty answer and text that is not JSON", async () => {
    send.mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: null, refusal: "no" } }] }), { status: 200 }),
    );
    await expect(groqStructured(req, deps)).rejects.toMatchObject({ code: "REFUSED" });
    send.mockResolvedValueOnce(new Response(JSON.stringify({ choices: [] }), { status: 200 }));
    await expect(groqStructured(req, deps)).rejects.toMatchObject({ code: "BAD_OUTPUT" });
    send.mockResolvedValueOnce(ok("not json"));
    await expect(groqStructured(req, deps)).rejects.toMatchObject({ code: "BAD_OUTPUT" });
  });
});
