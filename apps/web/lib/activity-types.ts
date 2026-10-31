/** The kinds of account activity the log records. Split out so pages and filters can use them without server-only code. */
export const ACTIVITY_TYPES = ["signup", "login", "publish", "lead", "tailor", "admin"] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  signup: "Sign-up",
  login: "Sign-in",
  publish: "Publish",
  lead: "Enquiry",
  tailor: "Tailoring",
  admin: "Admin",
};
