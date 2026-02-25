'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.TokenBucketRateLimiter = void 0;
/**
 * In-memory token-bucket limiter keyed by tenantId.
 *
 * Notes:
 * - Process-local only (no distributed coordination).
 * - Deterministic and synchronous for use at enqueue time.
 */
class TokenBucketRateLimiter {
  constructor(cfg) {
    this.cfg = cfg;
    this.buckets = new Map();
    if (cfg.capacity <= 0) throw new Error('TokenBucketRateLimiter: capacity must be > 0');
    if (cfg.refillPerSecond <= 0)
      throw new Error('TokenBucketRateLimiter: refillPerSecond must be > 0');
    this.now = cfg.now;
  }
  tryAcquire(tenantId, count) {
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
  refill(tenantId, nowMs) {
    const existing = this.buckets.get(tenantId);
    if (!existing) {
      const fresh = {
        tokens: this.cfg.capacity,
        lastRefillMs: nowMs,
      };
      this.buckets.set(tenantId, fresh);
      return fresh;
    }
    const elapsedMs = Math.max(0, nowMs - existing.lastRefillMs);
    const refillAmount = (elapsedMs / 1000) * this.cfg.refillPerSecond;
    const tokens = Math.min(this.cfg.capacity, existing.tokens + refillAmount);
    const updated = {
      tokens,
      lastRefillMs: nowMs,
    };
    this.buckets.set(tenantId, updated);
    return updated;
  }
}
exports.TokenBucketRateLimiter = TokenBucketRateLimiter;
//# sourceMappingURL=TokenBucketRateLimiter.js.map
