import { db } from "@/lib/db";
import { siteStore } from "@/lib/store/sites";

/** Test helpers: put pages into, and read them from, the test database without going through the app's own code. */

// The Redis page index is not involved, so a test that needs it sets it on its FakeRedis.
const pages = () => siteStore(db, async () => {});

/** Stores a page's documents, replacing what was there. Pass `published` to make it live. */
export const seedPage = (slug: string, docs: { draft: unknown; published?: unknown }): Promise<void> =>
  pages().put(slug, docs);

export const storedDraft = (slug: string): Promise<unknown | null> => pages().getDraft(slug);
export const storedPublished = (slug: string): Promise<unknown | null> => pages().getPublished(slug);

/** Removes every page. */
export async function clearPages(): Promise<void> {
  await db().query("delete from sites");
}
