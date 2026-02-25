/**
 * @file packages/@dvt/engine/src/outbox/TokenBucketRateLimiter.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — The token-bucket rate limiter controls outbox write pressure per tenant in memory
 * @consequence Bursts are limited per tenant, preventing global engine degradation from sudden overloads
 * @version 1.0.0
 * @date 2026-02-21
 */
import type { IOutboxRateLimiter } from './IOutboxRateLimiter.js';
export interface TokenBucketRateLimiterConfig {
  capacity: number;
  refillPerSecond: number;
  now: () => number;
}
/**
 * In-memory token-bucket limiter keyed by tenantId.
 *
 * Notes:
 * - Process-local only (no distributed coordination).
 * - Deterministic and synchronous for use at enqueue time.
 */
export declare class TokenBucketRateLimiter implements IOutboxRateLimiter {
  private readonly cfg;
  private readonly buckets;
  private readonly now;
  constructor(cfg: TokenBucketRateLimiterConfig);
  tryAcquire(tenantId: string, count: number): boolean;
  private refill;
}
//# sourceMappingURL=TokenBucketRateLimiter.d.ts.map
