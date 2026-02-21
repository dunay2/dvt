import type { IOutboxRateLimiter } from './IOutboxRateLimiter.js';

interface BucketState {
  tokens: number;
  lastRefillMs: number;
}

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
export class TokenBucketRateLimiter implements IOutboxRateLimiter {
  private readonly buckets = new Map<string, BucketState>();
  private readonly now: () => number;

  constructor(private readonly cfg: TokenBucketRateLimiterConfig) {
    if (cfg.capacity <= 0) throw new Error('TokenBucketRateLimiter: capacity must be > 0');
    if (cfg.refillPerSecond <= 0)
      throw new Error('TokenBucketRateLimiter: refillPerSecond must be > 0');
    this.now = cfg.now;
  }

  tryAcquire(tenantId: string, count: number): boolean {
    if (!tenantId) return false;
    if (count <= 0) return true;
    if (count > this.cfg.capacity) return false;

    const nowMs = this.now();
    const bucket = this.refill(tenantId, nowMs);

    if (bucket.tokens < count) return false;

    bucket.tokens -= count;
    this.buckets.set(tenantId, bucket);
    return true;
  }

  private refill(tenantId: string, nowMs: number): BucketState {
    const existing = this.buckets.get(tenantId);
    if (!existing) {
      const fresh: BucketState = {
        tokens: this.cfg.capacity,
        lastRefillMs: nowMs,
      };
      this.buckets.set(tenantId, fresh);
      return fresh;
    }

    const elapsedMs = Math.max(0, nowMs - existing.lastRefillMs);
    const refillAmount = (elapsedMs / 1000) * this.cfg.refillPerSecond;
    const tokens = Math.min(this.cfg.capacity, existing.tokens + refillAmount);

    const updated: BucketState = {
      tokens,
      lastRefillMs: nowMs,
    };
    this.buckets.set(tenantId, updated);
    return updated;
  }
}
