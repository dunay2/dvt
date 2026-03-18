import { describe, it, expect } from 'vitest';

import { resolvePolicies } from '../../src/domain/policies.js';

describe('policies', () => {
  it('applies defaults when undefined', () => {
    const p = resolvePolicies(undefined);
    expect(p.stepTimeoutMs).toBeGreaterThan(0);
    expect(p.retries?.maxAttempts).toBeGreaterThan(0);
    expect(p.concurrency?.maxInFlight).toBeGreaterThan(0);
  });

  it('maps timeout budget seconds to internal milliseconds', () => {
    const resolved = resolvePolicies({
      timeout: { kind: 'budget', maxSeconds: 45 },
    });

    expect(resolved.stepTimeoutMs).toBe(45_000);
  });

  it('maps unbounded timeout to omitted internal timeout', () => {
    const resolved = resolvePolicies({
      timeout: { kind: 'unbounded' },
    });

    expect(resolved.stepTimeoutMs).toBeUndefined();
  });

  it('maps at-most-once retry to one attempt with zero planner backoff', () => {
    const resolved = resolvePolicies({
      retry: { kind: 'at-most-once' },
    });

    expect(resolved.retries).toEqual({
      maxAttempts: 1,
      backoffMs: 0,
    });
  });

  it('maps bounded retry to internal maxAttempts with zero planner backoff', () => {
    const resolved = resolvePolicies({
      retry: { kind: 'at-most-N', maxAttempts: 4 },
    });

    expect(resolved.retries).toEqual({
      maxAttempts: 4,
      backoffMs: 0,
    });
  });

  it('maps sequential concurrency to one in-flight step', () => {
    const resolved = resolvePolicies({
      concurrency: { kind: 'sequential' },
    });

    expect(resolved.concurrency).toEqual({ maxInFlight: 1 });
  });

  it('maps unbounded concurrency to omitted internal cap', () => {
    const resolved = resolvePolicies({
      concurrency: { kind: 'unbounded' },
    });

    expect(resolved.concurrency).toBeUndefined();
  });
});
