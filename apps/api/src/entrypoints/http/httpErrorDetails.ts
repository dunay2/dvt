/**
 * Owned concern: shared helpers for optional `error.details` handling inside
 * the HTTP runtime error translation boundary.
 */
export function compactHttpErrorDetails(
  details: Record<string, unknown>
): Readonly<Record<string, unknown>> | undefined {
  return Object.keys(details).length === 0 ? undefined : details;
}

export function withOptionalHttpErrorDetails(details: Readonly<Record<string, unknown>> | undefined): {
  readonly details?: Readonly<Record<string, unknown>>;
} {
  return details === undefined ? {} : { details };
}
