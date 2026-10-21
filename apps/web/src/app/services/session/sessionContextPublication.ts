/** Owned concern: admit only current, live session query results to shared browser projections. */
export type SessionContextPublication = Readonly<{ assertCurrent(): void }>;

export class SessionContextDiscardedError extends Error {
  constructor(readonly reason: 'cancelled' | 'superseded') {
    super(`Session context ${reason}.`);
    this.name = 'SessionContextDiscardedError';
  }
}

// The browser stores have one publication owner, regardless of API client instance.
let currentAttempt: symbol | undefined;

export function beginSessionContextPublication(signal?: AbortSignal): SessionContextPublication {
  if (signal?.aborted) throw new SessionContextDiscardedError('cancelled');
  const attempt = Symbol('session-context');
  currentAttempt = attempt;
  return {
    assertCurrent() {
      if (signal?.aborted) throw new SessionContextDiscardedError('cancelled');
      if (currentAttempt !== attempt) throw new SessionContextDiscardedError('superseded');
    },
  };
}
