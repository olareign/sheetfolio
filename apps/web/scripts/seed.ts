/**
 * Seeds sites and sign-in details (PRD §7, §9).
 *
 *   pnpm seed                                  # seed/idris.json; refuses to overwrite an existing site
 *   pnpm seed --force                          # overwrite its draft + published page
 *   pnpm seed --email you@example.com          # also link the slug to that sign-in email
 *   pnpm seed --file seed/other.json
 *   pnpm seed --file seed/x.json --email a@b.com --username ada
 *                                              # ...and give that account a username + generated password
 *   pnpm seed --credentials-only --slug idris-rasaq --username idris-rasaq
 *                                              # give an EXISTING account a username + generated password
 *   pnpm seed --credentials-only --slug idris-rasaq --reset-password
 *                                              # replace an existing password
 *   pnpm seed --list                           # accounts and whether each has a password
 *
 * Generated passwords are written to `.credentials.local` (git-ignored, owner-only) and never printed.
 * Set SEED_PASSWORD to choose one yourself. Reads UPSTASH_REDIS_REST_URL / _TOKEN from the environment or .env.local.
 * Writes through the same stores as the app, so ACCOUNTS_STORE / SITES_STORE (and DATABASE_URL when one is not "redis")
 * decide where the accounts and pages land.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync, chmodSync, existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { PublishableSite, Slug, UserRecord } from "../content/schemas";
import { getCredentials, setPassword } from "../lib/credential-store";
import { neonDb } from "../lib/db/neon";
import { modesFromEnv, wireStores, type Stores } from "../lib/store/wire";

const SeedFile = z.object({ slug: Slug, site: z.record(z.string(), z.unknown()) });
const CREDENTIALS_FILE = ".credentials.local";

function fail(message: string): never {
  console.error(`seed: ${message}`);
  process.exit(1);
}

/** Every account, from whichever store is the source. */
async function accounts(stores: Stores): Promise<{ email: string; record: UserRecord }[]> {
  return stores.users.list();
}

/** Saves the details to the local file only. The password is not printed, so it stays out of logs and chat. */
function saveCredentials(entry: { slug: string; username: string; email: string; password: string }): void {
  const existed = existsSync(CREDENTIALS_FILE);
  appendFileSync(
    CREDENTIALS_FILE,
    `${new Date().toISOString()}  /${entry.slug}  username=${entry.username}  email=${entry.email}  password=${entry.password}\n`,
    { mode: 0o600 },
  );
  if (existed) chmodSync(CREDENTIALS_FILE, 0o600);
}

async function giveCredentials(
  stores: Stores,
  args: { slug: string; email: string; username: string; reset: boolean },
): Promise<void> {
  const creds = stores.credentials;
  if ((await getCredentials(creds, args.email)) && !args.reset) {
    console.log(`seed: /${args.slug} already has a password; left unchanged (use --reset-password to replace it).`);
    return;
  }
  const password = process.env.SEED_PASSWORD || randomBytes(18).toString("base64url");
  const result = await setPassword(creds, { email: args.email, password, username: args.username });
  if (!result.ok) fail(`the username "${args.username}" belongs to another account`);
  saveCredentials({ slug: args.slug, username: args.username, email: args.email, password });
  console.log(
    `seed: /${args.slug} can now sign in as "${args.username}" (or its email). Password saved to ${CREDENTIALS_FILE}.`,
  );
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      file: { type: "string", default: "seed/idris.json" },
      email: { type: "string" },
      username: { type: "string" },
      slug: { type: "string" },
      force: { type: "boolean", default: false },
      "credentials-only": { type: "boolean", default: false },
      "reset-password": { type: "boolean", default: false },
      list: { type: "boolean", default: false },
    },
  });
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) fail("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set");
  const redis = new Redis({ url, token });
  const modes = modesFromEnv(process.env);
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (Object.values(modes).some((m) => m !== "redis") && !databaseUrl)
    fail("DATABASE_URL must be set when a store is not on redis");
  const stores = wireStores({
    redis: () => redis,
    db: () => neonDb(databaseUrl ?? fail("DATABASE_URL is not set")),
    modes,
  });

  if (values.list) {
    for (const { email, record } of await accounts(stores)) {
      const creds = await getCredentials(stores.credentials, email);
      console.log(
        `/${record.slug}  ${record.role}  password: ${creds ? `yes (${creds.username ?? "no username"})` : "no"}`,
      );
    }
    return;
  }

  if (values["credentials-only"]) {
    if (!values.slug) fail("--credentials-only needs --slug");
    const slug = Slug.parse(values.slug);
    const owner = (await accounts(stores)).find((a) => a.record.slug === slug);
    if (!owner) fail(`no account owns /${slug}`);
    await giveCredentials(stores, {
      slug,
      email: owner.email,
      username: values.username ?? slug,
      reset: values["reset-password"],
    });
    return;
  }

  const file = SeedFile.safeParse(JSON.parse(readFileSync(values.file, "utf8")));
  if (!file.success) fail(`${values.file}: ${z.prettifyError(file.error)}`);
  const { slug } = file.data;
  const now = new Date().toISOString();
  const parsed = PublishableSite.safeParse({ ...file.data.site, updatedAt: now });
  if (!parsed.success) fail(`${values.file} is not a publishable site:\n${z.prettifyError(parsed.error)}`);
  const site = parsed.data;

  if (!values.force && (await stores.sites.getDraft(slug)) !== null) {
    fail(`/${slug} already has a draft. Re-run with --force to overwrite its draft and published page.`);
  }
  if (values.username && !values.email) fail("--username needs --email (the account it belongs to)");

  const email = values.email?.trim().toLowerCase();
  if (email) {
    const existing = await stores.users.get(email);
    if (existing) {
      if (existing.slug !== slug) fail(`${email} already owns /${existing.slug}`);
    } else {
      const record = UserRecord.parse({
        id: `seed:${email}`,
        slug,
        role: "engineer",
        name: site.profile.name,
        createdAt: now,
      });
      const created = await stores.users.create({ email, record });
      if (created === "SLUG_TAKEN") fail(`/${slug} is already claimed by another account`);
      if (created === "EMAIL_TAKEN") fail(`${email} already has an account`);
    }
  }

  await stores.sites.create(slug, site);
  await stores.sites.put(slug, {
    draft: site,
    published: { ...site, publishedAt: now, settings: { ...site.settings, status: "published" } },
  });

  console.log(`seed: wrote /${slug} (${site.projects.length} projects) to draft and published.`);
  console.log("seed: a running app keeps its cached public page until the next Publish from the dashboard.");

  if (email && values.username) {
    await giveCredentials(stores, { slug, email, username: values.username, reset: values["reset-password"] });
  }
}

main().catch((err: unknown) => fail(err instanceof Error ? err.message : String(err)));
