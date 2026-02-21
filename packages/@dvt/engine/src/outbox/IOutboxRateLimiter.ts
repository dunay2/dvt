/**
 * Per-tenant outbox rate limiter.
 *
 * Called at enqueue time (before writing to the outbox) to prevent a single
 * tenant from saturating the outbox worker. Implementations MUST be
 * thread-safe with respect to concurrent callers.
 */
export interface IOutboxRateLimiter {
  /**
   * Attempts to acquire `count` tokens for `tenantId`.
   *
   * @returns true if the tokens were granted (enqueue proceeds),
   *          false if the tenant is currently over-limit (caller MUST throw
   *          `OutboxRateLimitExceededError` or equivalent).
   */
  tryAcquire(tenantId: string, count: number): boolean;
}
