import { credentialKeys } from "./store/credentials";

/**
 * Every Redis key the app owns. Redis holds only what is short-lived or rebuildable: reset tokens, view and download
 * counters, and the index of page addresses. Accounts, passwords, enquiries and pages live in Postgres.
 */
export const keys = {
  ...credentialKeys,
  viewsDay: (slug: string, day: string) => `views:${slug}:${day}`,
  viewsProject: (slug: string, projectId: string) => `views:${slug}:p:${projectId}`,
  /** All-time count of "Download CV" clicks on the public page. */
  cvDownloads: (slug: string) => `cv:${slug}:downloads`,
  /** Every registered page address: a fast "is this a real page?" check for the view counter. */
  sites: () => "sites",
} as const;
