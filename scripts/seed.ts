/**
 * Seeds a site document into draft + published (PRD §7, §9).
 *
 *   pnpm seed                         # seed/idris.json; refuses to overwrite an existing site
 *   pnpm seed --force                 # overwrite its draft + published page
 *   pnpm seed --email you@example.com # also link the slug to that sign-in email
 *   pnpm seed --file seed/other.json
 *
 * Reads UPSTASH_REDIS_REST_URL / _TOKEN from the environment or .env.local.
 */
import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { PublishableSite, Slug, UserRecord } from "../content/schemas";

const SeedFile = z.object({ slug: Slug, site: z.record(z.string(), z.unknown()) });

function fail(message: string): never {
  console.error(`seed: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      file: { type: "string", default: "seed/idris.json" },
      email: { type: "string" },
      force: { type: "boolean", default: false },
    },
  });
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) fail("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set");

  const file = SeedFile.safeParse(JSON.parse(readFileSync(values.file, "utf8")));
  if (!file.success) fail(`${values.file}: ${z.prettifyError(file.error)}`);
  const { slug } = file.data;
  const now = new Date().toISOString();
  const parsed = PublishableSite.safeParse({ ...file.data.site, updatedAt: now });
  if (!parsed.success) fail(`${values.file} is not a publishable site:\n${z.prettifyError(parsed.error)}`);
  const site = parsed.data;

  const redis = new Redis({ url, token });
  const draftKey = `site:${slug}:draft`;
  if (!values.force && (await redis.exists(draftKey))) {
    fail(`/${slug} already has a draft. Re-run with --force to overwrite its draft and published page.`);
  }

  if (values.email) {
    const email = values.email.trim().toLowerCase();
    const existing = await redis.get<unknown>(`user:${email}`);
    if (existing) {
      const record = UserRecord.parse(existing);
      if (record.slug !== slug) fail(`${email} already owns /${record.slug}`);
    } else {
      const owner = `seed:${email}`;
      const claimed = await redis.set(`slug:${slug}`, owner, { nx: true });
      if (claimed !== "OK" && (await redis.get<string>(`slug:${slug}`)) !== owner) {
        fail(`/${slug} is already claimed by another account`);
      }
      const record = UserRecord.parse({ id: owner, slug, role: "engineer", name: site.profile.name, createdAt: now });
      await redis.set(`user:${email}`, record);
    }
  }

  const tx = redis.multi();
  tx.set(draftKey, site);
  tx.set(`site:${slug}:published`, { ...site, publishedAt: now, settings: { ...site.settings, status: "published" } });
  tx.sadd("sites", slug);
  await tx.exec();

  console.log(`seed: wrote /${slug} (${site.projects.length} projects) to draft and published.`);
  console.log("seed: a running app keeps its cached public page until the next Publish from the dashboard.");
}

main().catch((err: unknown) => fail(err instanceof Error ? err.message : String(err)));
