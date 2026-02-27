/**
 * @file packages/@dvt/engine/src/outbox/IOutboxRateLimiter.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — El control de caudal del outbox se define por contrato para proteger la estabilidad multi-tenant
 * @consequence The engine can enforce per-tenant limits without coupling to a specific rate-limiting strategy
 * @version 1.0.0
 * @date 2026-02-21
 */
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
