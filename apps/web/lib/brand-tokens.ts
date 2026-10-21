/**
 * Light-theme colours for places that can't read CSS variables: the CV PDF, the OG image and emails.
 * `brand-tokens.test.ts` fails if these drift from styles/tokens.css.
 */
export const BRAND_TOKENS = {
  paper: "#ffffff", // --paper-raised: a CV prints on white-ish paper
  ink: "#0f172a",
  inkMuted: "#475569",
  rule: "#cbd5e1",
  hairline: "#e2e8f0",
  blueprint: "#4338ca",
  hivisInk: "#b42318",
  cured: "#15803d",
  page: "#fafafd", // --paper: the ground behind panels (email body)
  paperSunken: "#f1f2fa",
  onBlueprint: "#ffffff",
} as const;

/** Token each mirror entry must equal, in the light ("sheet") theme. */
export const BRAND_TOKEN_SOURCE: Record<keyof typeof BRAND_TOKENS, string> = {
  paper: "--paper-raised",
  ink: "--ink",
  inkMuted: "--ink-muted",
  rule: "--rule",
  hairline: "--hairline",
  blueprint: "--blueprint",
  hivisInk: "--hivis-ink",
  cured: "--cured",
  page: "--paper",
  paperSunken: "--paper-sunken",
  onBlueprint: "--on-blueprint",
};
