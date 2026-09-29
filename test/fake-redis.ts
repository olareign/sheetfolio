/**
 * In-memory stand-in for the subset of @upstash/redis the app uses.
 * Mirrors Upstash's automatic JSON (de)serialisation so stored values round-trip the same way.
 */
type Stored = string;

const enc = (v: unknown): Stored => (typeof v === "string" ? v : JSON.stringify(v));
const dec = (s: Stored): unknown => {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
};

export class FakeRedis {
  strings = new Map<string, Stored>();
  lists = new Map<string, Stored[]>();
  sets = new Map<string, Set<string>>();
  ttls = new Map<string, number>();
  /** Makes the next pipeline/multi `exec()` throw, to exercise rollback paths. */
  failNextExec = false;

  async get<T = unknown>(key: string): Promise<T | null> {
    const v = this.strings.get(key);
    return v === undefined ? null : (dec(v) as T);
  }

  async set(key: string, value: unknown, opts?: { nx?: boolean }): Promise<"OK" | null> {
    if (opts?.nx && this.strings.has(key)) return null;
    this.strings.set(key, enc(value));
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let n = 0;
    for (const k of keys) {
      if (this.strings.delete(k) || this.lists.delete(k) || this.sets.delete(k)) n++;
      this.ttls.delete(k);
    }
    return n;
  }

  async incr(key: string): Promise<number> {
    const next = Number(this.strings.get(key) ?? "0") + 1;
    this.strings.set(key, String(next));
    return next;
  }

  async decr(key: string): Promise<number> {
    const next = Number(this.strings.get(key) ?? "0") - 1;
    this.strings.set(key, String(next));
    return next;
  }

  async mget<T = unknown>(...keys: string[]): Promise<T> {
    return keys.map((k) => {
      const v = this.strings.get(k);
      return v === undefined ? null : dec(v);
    }) as T;
  }

  async llen(key: string): Promise<number> {
    return this.lists.get(key)?.length ?? 0;
  }

  async smismember(key: string, members: string[]): Promise<(0 | 1)[]> {
    const s = this.sets.get(key);
    return members.map((m) => (s?.has(m) ? 1 : 0));
  }

  async expire(key: string, seconds: number): Promise<number> {
    this.ttls.set(key, seconds);
    return 1;
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    const s = this.sets.get(key) ?? new Set<string>();
    const before = s.size;
    members.forEach((m) => s.add(m));
    this.sets.set(key, s);
    return s.size - before;
  }

  async sismember(key: string, member: string): Promise<0 | 1> {
    return this.sets.get(key)?.has(member) ? 1 : 0;
  }

  async lpush(key: string, ...values: unknown[]): Promise<number> {
    const l = this.lists.get(key) ?? [];
    for (const v of values) l.unshift(enc(v));
    this.lists.set(key, l);
    return l.length;
  }

  async ltrim(key: string, start: number, stop: number): Promise<"OK"> {
    const l = this.lists.get(key) ?? [];
    this.lists.set(key, l.slice(start, stop + 1));
    return "OK";
  }

  async lrange<T = unknown>(key: string, start: number, stop: number): Promise<T[]> {
    const l = this.lists.get(key) ?? [];
    const end = stop < 0 ? l.length + stop + 1 : stop + 1; // Redis: -1 is the last element
    return l.slice(start, end).map((v) => dec(v) as T);
  }

  pipeline() {
    return this.queue();
  }

  multi() {
    return this.queue();
  }

  private queue() {
    const ops: (() => Promise<unknown>)[] = [];
    const proxy: Record<string, unknown> = {
      exec: async () => {
        if (this.failNextExec) {
          this.failNextExec = false;
          throw new Error("fake exec failure");
        }
        const out: unknown[] = [];
        for (const op of ops) out.push(await op());
        return out;
      },
    };
    for (const name of ["set", "get", "del", "incr", "expire", "sadd", "lpush", "ltrim"] as const) {
      proxy[name] = (...args: unknown[]) => {
        ops.push(() => (this[name] as (...a: unknown[]) => Promise<unknown>)(...args));
        return proxy;
      };
    }
    return proxy;
  }
}
