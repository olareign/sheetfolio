import { afterEach, describe, expect, it, vi } from "vitest";
import { mirrorOf, primaryOf, read, write, STORE_MODES } from "./mode";

afterEach(() => vi.restoreAllMocks());

describe("modes", () => {
  it("read and write on Redis until a move starts, and on Postgres once it is done", () => {
    expect(STORE_MODES.map((m) => [m, primaryOf(m), mirrorOf(m)])).toEqual([
      ["redis", "redis", null],
      ["dual", "redis", "pg"],
      ["pg-first", "pg", "redis"],
      ["postgres", "pg", null],
    ]);
  });
});

describe("read / write", () => {
  const make = (log: string[]) => ({
    redis: async () => (log.push("redis"), "from-redis"),
    pg: async () => (log.push("pg"), "from-pg"),
  });

  it("reads only from the primary side", async () => {
    const log: string[] = [];
    expect(await read("dual", make(log))).toBe("from-redis");
    expect(await read("pg-first", make(log))).toBe("from-pg");
    expect(log).toEqual(["redis", "pg"]);
  });

  it("writes to the primary, returns its result, then copies to the mirror", async () => {
    const log: string[] = [];
    expect(await write("dual", "x", make(log))).toBe("from-redis");
    expect(await write("pg-first", "x", make(log))).toBe("from-pg");
    expect(await write("redis", "x", make(log))).toBe("from-redis");
    expect(await write("postgres", "x", make(log))).toBe("from-pg");
    expect(log).toEqual(["redis", "pg", "pg", "redis", "redis", "pg"]);
  });

  it("does not copy a write the primary refused", async () => {
    const log: string[] = [];
    await write("dual", "x", make(log), (r) => r !== "from-redis");
    expect(log).toEqual(["redis"]);
  });

  it("never fails the request when only the copy fails, and logs the operation but not the data", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await write("dual", "add enquiry", {
      redis: async () => "saved",
      pg: async () => {
        throw new Error("connection refused");
      },
    });
    expect(result).toBe("saved");
    expect(error).toHaveBeenCalledWith("[store] add enquiry: copy to pg failed:", "connection refused");
  });

  it("does fail when the primary fails", async () => {
    await expect(
      write("pg-first", "x", { redis: async () => "ok", pg: async () => Promise.reject(new Error("pg down")) }),
    ).rejects.toThrow("pg down");
  });
});
