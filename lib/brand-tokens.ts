/**
 * The PDF renderer can't read CSS variables, so the Drawing-sheet tokens it uses are mirrored here.
 * `cv-tokens.test.ts` fails if these drift from styles/tokens.css.
 */
export const CV_TOKENS = {
  paper: "#fbfaf6", // --paper-raised: a CV prints on white-ish paper
  ink: "#18212c",
  inkMuted: "#4f5966",
  rule: "#8f887a",
  hairline: "#d8d2c4",
  blueprint: "#1d4f7c",
  hivisInk: "#a8400a",
  cured: "#2b6242",
} as const;

/** Token each mirror entry must equal, in the sheet theme. */
export const CV_TOKEN_SOURCE: Record<keyof typeof CV_TOKENS, string> = {
  paper: "--paper-raised",
  ink: "--ink",
  inkMuted: "--ink-muted",
  rule: "--rule",
  hairline: "--hairline",
  blueprint: "--blueprint",
  hivisInk: "--hivis-ink",
  cured: "--cured",
};
