/** Owned concern: prove real per-tenant outbox budget admission and access-policy denial. */
import { describe, expect, it } from 'vitest';

import { OutboxRateLimitExceededError } from '../../src/contracts/errors.js';
import { TokenBucketRateLimiter } from '../../src/outbox/TokenBucketRateLimiter.js';
import { AllowAllAuthorizer } from '../../src/security/authorizer.js';
import { PlanRefPolicy } from '../../src/security/planRefPolicy.js';
import { RunAccessPolicy } from '../../src/security/RunAccessPolicy.js';

describe('tenant outbox token budget', () => {
  it.each([
    { capacity: 0, refillPerSecond: 1, message: 'capacity must be > 0' },
    { capacity: -1, refillPerSecond: 1, message: 'capacity must be > 0' },
    { capacity: 1, refillPerSecond: 0, message: 'refillPerSecond must be > 0' },
    { capacity: 1, refillPerSecond: -1, message: 'refillPerSecond must be > 0' },
  ])('rejects nonpositive configuration: $message', ({ message, ...config }) => {
    expect(() => new TokenBucketRateLimiter({ ...config, now: () => 0 })).toThrow(message);
  });

  it('starts each tenant at capacity and keeps exhausted balances independent', () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 2, refillPerSecond: 1, now: () => 0 });
    expect(limiter.tryAcquire('tenant-a', 2)).toBe(true);
    expect(limiter.tryAcquire('tenant-a', 1)).toBe(false);
    expect(limiter.tryAcquire('tenant-b', 1)).toBe(true);
    expect(limiter.tryAcquire('tenant-b', 1)).toBe(true);
    expect(limiter.tryAcquire('tenant-b', 1)).toBe(false);
    expect(limiter.tryAcquire('tenant-a', 1)).toBe(false);
  });

  it('accumulates fractional refill without debiting rejected requests', () => {
    let now = 0;
    const limiter = new TokenBucketRateLimiter({ capacity: 2, refillPerSecond: 1, now: () => now });
    expect(limiter.tryAcquire('tenant-a', 2)).toBe(true);
    now = 500;
    expect(limiter.tryAcquire('tenant-a', 1)).toBe(false);
    now = 1_000;
    expect(limiter.tryAcquire('tenant-a', 1)).toBe(true);
    expect(limiter.tryAcquire('tenant-a', 1)).toBe(false);
  });

  it('caps refill at capacity and does not manufacture tokens when elapsed time is negative', () => {
    let now = 1_000;
    const limiter = new TokenBucketRateLimiter({ capacity: 2, refillPerSecond: 1, now: () => now });
    expect(limiter.tryAcquire('tenant-a', 2)).toBe(true);
    now = 500;
    expect(limiter.tryAcquire('tenant-a', 1)).toBe(false);
    now = 100_500;
    expect(limiter.tryAcquire('tenant-a', 2)).toBe(true);
    expect(limiter.tryAcquire('tenant-a', 1)).toBe(false);
  });

  it('rejects missing tenants and oversize acquisition without consuming capacity', () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 2, refillPerSecond: 1, now: () => 0 });
    expect(limiter.tryAcquire('', 1)).toBe(false);
    expect(limiter.tryAcquire('', 0)).toBe(false);
    expect(limiter.tryAcquire('tenant-a', 3)).toBe(false);
    expect(limiter.tryAcquire('tenant-a', 0)).toBe(true);
    expect(limiter.tryAcquire('tenant-a', -1)).toBe(true);
    expect(limiter.tryAcquire('tenant-a', 2)).toBe(true);
    expect(limiter.tryAcquire('tenant-a', 0)).toBe(true);
    expect(limiter.tryAcquire('tenant-a', 1)).toBe(false);
  });

  it('propagates real one-token exhaustion through RunAccessPolicy as typed tenant denial', () => {
    const limiter = new TokenBucketRateLimiter({ capacity: 1, refillPerSecond: 1, now: () => 0 });
    const policy = new RunAccessPolicy({
      authorizer: new AllowAllAuthorizer({ runtimeMode: 'non-production' }),
      planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
      outboxRateLimiter: limiter,
    });
    expect(() => policy.checkRateLimit('tenant-a')).not.toThrow();
    expect(() => policy.checkRateLimit('tenant-a')).toThrow(OutboxRateLimitExceededError);
    expect(() => policy.checkRateLimit('tenant-a')).toThrow(
      expect.objectContaining({
        messageKey: 'engine.error.outbox_rate_limit_exceeded',
        messageParams: { tenantId: 'tenant-a' },
      })
    );
    expect(() => policy.checkRateLimit('tenant-b')).not.toThrow();
  });
});
