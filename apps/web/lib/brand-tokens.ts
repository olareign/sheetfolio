/**
 * Sheet-theme colours for places that can't read CSS variables: the CV PDF, the OG image and emails.
 * `brand-tokens.test.ts` fails if these drift from styles/tokens.css.
 */
export const BRAND_TOKENS = {
  paper: "#fbfaf6", // --paper-raised: a CV prints on white-ish paper
  ink: "#18212c",
  inkMuted: "#4f5966",
  rule: "#8f887a",
  hairline: "#d8d2c4",
  blueprint: "#1d4f7c",
  hivisInk: "#a8400a",
  cured: "#2b6242",
  page: "#f3f0e8", // --paper: the ground behind panels (email body)
  paperSunken: "#e9e5da",
  onBlueprint: "#ffffff",
} as const;

/** Token each mirror entry must equal, in the sheet theme. */
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
