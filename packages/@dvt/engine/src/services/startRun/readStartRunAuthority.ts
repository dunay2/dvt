/**
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @ownedConcern Preserve absence and read failure as distinct start-run authority observations.
 * @decision Capture observation outcomes without granting mutation authority.
 * @version 1.0.0
 */
export type StartRunAuthorityRead<T> =
  | { readonly kind: 'found'; readonly value: T }
  | { readonly kind: 'missing' }
  | { readonly kind: 'failed'; readonly error: unknown };

/** Captures an observation only; it never grants ownership or authorizes a write. */
export async function readStartRunAuthority<T>(
  read: () => Promise<T | null>
): Promise<StartRunAuthorityRead<T>> {
  try {
    const value = await read();
    return value === null ? { kind: 'missing' } : { kind: 'found', value };
  } catch (error) {
    return { kind: 'failed', error };
  }
}
