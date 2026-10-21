import { describe, expect, it, vi } from "vitest";

const limits = vi.hoisted(() => ({
  run: undefined as unknown as (prefix: string, key: string) => Promise<{ success: boolean }>,
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = () => "window";
    constructor(private readonly options: { prefix: string }) {}
    limit(key: string) {
      return limits.run(this.options.prefix, key);
    }
  },
}));
vi.mock("./redis", () => ({ redis: () => ({}) }));

const { allowLoginAttempt, allowResetRequest, clientIp } = await import("./ratelimit");

describe("clientIp", () => {
  it("takes the first x-forwarded-for hop", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });
  it("falls back to x-real-ip, then 'unknown'", () => {
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("allowLoginAttempt", () => {
  it("allows an attempt when the account and the address are both under their limits", async () => {
    limits.run = async () => ({ success: true });
    expect(await allowLoginAttempt("ada", "203.0.113.7")).toBe(true);
  });

  it("blocks when the account limit is hit, even from a fresh address", async () => {
    limits.run = async (prefix) => ({ success: !prefix.endsWith("account") });
    expect(await allowLoginAttempt("ada", "203.0.113.7")).toBe(false);
  });

  it("blocks when the address limit is hit, even for a fresh account", async () => {
    limits.run = async (prefix) => ({ success: !prefix.endsWith("ip") });
    expect(await allowLoginAttempt("ada", "203.0.113.7")).toBe(false);
  });

  it("counts an account case-insensitively so changing case does not reset the limit", async () => {
    const keys: string[] = [];
    limits.run = async (prefix, key) => {
      if (prefix.endsWith("account")) keys.push(key);
      return { success: true };
    };
    await allowLoginAttempt("  Ada@Example.COM ", "203.0.113.7");
    expect(keys).toEqual(["ada@example.com"]);
  });

  it("fails open and logs without the identifier when the limiter is unreachable", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    limits.run = async () => {
      throw new Error("connection refused");
    };
    expect(await allowLoginAttempt("ada@example.com", "203.0.113.7")).toBe(true);
    expect(log).toHaveBeenCalledOnce();
    expect(String(log.mock.calls[0])).not.toContain("ada@example.com");
    log.mockRestore();
  });
});

describe("allowResetRequest", () => {
  it("allows a request under both limits and counts the account case-insensitively", async () => {
    const keys: string[] = [];
    limits.run = async (prefix, key) => {
      keys.push(`${prefix}:${key}`);
      return { success: true };
    };
    expect(await allowResetRequest(" Ada@Example.com ", "203.0.113.7")).toBe(true);
    expect(keys).toContain("ratelimit:reset:account:ada@example.com");
  });

  it.each(["account", "ip"])("blocks when the %s limit is hit", async (which) => {
    limits.run = async (prefix) => ({ success: !prefix.endsWith(which) });
    expect(await allowResetRequest("ada@example.com", "203.0.113.7")).toBe(false);
  });

  it("fails open when the limiter is unreachable", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    limits.run = async () => {
      throw new Error("connection refused");
    };
    expect(await allowResetRequest("ada@example.com", "203.0.113.7")).toBe(true);
    log.mockRestore();
  });
});
