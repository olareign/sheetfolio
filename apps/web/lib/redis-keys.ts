import { credentialKeys } from "./credential-store";

/** Every Redis key the app owns, in one place (PRD §5.1). Auth.js keys live under `auth:`. */
export const keys = {
  user: (email: string) => `user:${email.toLowerCase()}`,
  slug: (slug: string) => `slug:${slug}`,
  ...credentialKeys,
  draft: (slug: string) => `site:${slug}:draft`,
  published: (slug: string) => `site:${slug}:published`,
  /** First publish time, set once (NX): signup → first publish is a success metric (PRD §11). */
  firstPublished: (slug: string) => `site:${slug}:first-published`,
  viewsDay: (slug: string, day: string) => `views:${slug}:${day}`,
  viewsProject: (slug: string, projectId: string) => `views:${slug}:p:${projectId}`,
  /** All-time count of "Download CV" clicks on the public page. */
  cvDownloads: (slug: string) => `cv:${slug}:downloads`,
  leads: (slug: string) => `leads:${slug}`,
  leadsUnread: (slug: string) => `leads:${slug}:unread`,
  /** Ids of leads the engineer has read (kept apart so marking read never rewrites the list). */
  leadsRead: (slug: string) => `leads:${slug}:read`,
  sites: () => "sites",
} as const;
