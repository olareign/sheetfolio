/** What a store raises when data it holds does not have the expected shape: a bug or a migration gap, never user error. */
export class StoredDataError extends Error {
  readonly code = "INVALID" as const;
  constructor(
    message: string,
    readonly issues: readonly unknown[] = [],
  ) {
    super(message);
    this.name = "StoredDataError";
  }
}
