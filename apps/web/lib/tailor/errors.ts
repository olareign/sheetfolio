export type TailorFailure = "NOT_CONFIGURED" | "REFUSED" | "BAD_OUTPUT" | "BUSY" | "UPSTREAM";

/** A failure of the AI step, with a message that is safe to show to the person. */
export class TailorError extends Error {
  constructor(
    readonly code: TailorFailure,
    message: string,
  ) {
    super(message);
    this.name = "TailorError";
  }
}
