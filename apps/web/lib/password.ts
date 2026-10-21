import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// No `server-only` marker: the seed script hashes passwords too, and node:crypto cannot load in a browser anyway.
// scrypt from Node's standard library: memory-hard, no native dependency. The parameters travel with
// each hash (`scrypt$N$r$p$salt$hash`), so they can be raised later and old hashes still verify.
const COST = { N: 2 ** 15, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
// N=2^15, r=8 needs ~32 MiB, right at Node's default limit; leave headroom.
const MAX_MEMORY = 64 * 1024 * 1024;

function derive(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, { ...options, maxmem: MAX_MEMORY }, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, COST);
  return ["scrypt", COST.N, COST.r, COST.p, salt.toString("base64"), key.toString("base64")].join("$");
}

/** False for a wrong password and for a malformed stored hash; never throws on bad stored data. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !salt || !hash) return false;
  const options = { N: Number(n), r: Number(r), p: Number(p) };
  if (![options.N, options.r, options.p].every(Number.isSafeInteger)) return false;
  const expected = Buffer.from(hash, "base64");
  let actual: Buffer;
  try {
    actual = await derive(password, Buffer.from(salt, "base64"), options);
  } catch {
    return false; // parameters scrypt refuses (e.g. N not a power of two)
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

let dummy: Promise<string> | undefined;

/**
 * Burns the same time as a real check. Used when the account does not exist, so response time
 * does not reveal which usernames or emails are registered.
 */
export async function verifyAgainstDummy(password: string): Promise<false> {
  dummy ??= hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(password, await dummy);
  return false;
}
