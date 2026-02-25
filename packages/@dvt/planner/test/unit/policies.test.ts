import { describe, it, expect } from 'vitest';

import { PlannerError, PlannerErrorCode } from '../../src/domain/errors.js';
import { resolvePolicies } from '../../src/domain/policies.js';

describe('policies', () => {
  it('applies defaults when undefined', () => {
    const p = resolvePolicies(undefined);
    expect(p.stepTimeoutMs).toBeGreaterThan(0);
    expect(p.retries.maxAttempts).toBeGreaterThan(0);
    expect(p.concurrency.maxInFlight).toBeGreaterThan(0);
    expect(p.custom).toEqual({});
  });

  it('rejects invalid timeout (0)', () => {
    let thrown: unknown;
    try {
      resolvePolicies({ stepTimeoutMs: 0 });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(PlannerError);
    expect((thrown as PlannerError).code).toBe(PlannerErrorCode.INVALID_INPUT);
  });

  it('rejects negative timeout', () => {
    let thrown: unknown;
    try {
      resolvePolicies({ stepTimeoutMs: -1 });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(PlannerError);
    expect((thrown as PlannerError).code).toBe(PlannerErrorCode.INVALID_INPUT);
  });

  it('rejects retries.maxAttempts < 1', () => {
    let thrown: unknown;
    try {
      resolvePolicies({ retries: { maxAttempts: 0, backoffMs: 0 } });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(PlannerError);
    expect((thrown as PlannerError).code).toBe(PlannerErrorCode.INVALID_INPUT);
  });

  it('rejects negative backoffMs', () => {
    let thrown: unknown;
    try {
      resolvePolicies({ retries: { maxAttempts: 1, backoffMs: -1 } });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(PlannerError);
    expect((thrown as PlannerError).code).toBe(PlannerErrorCode.INVALID_INPUT);
  });

  it('rejects concurrency.maxInFlight < 1', () => {
    let thrown: unknown;
    try {
      resolvePolicies({ concurrency: { maxInFlight: 0 } });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(PlannerError);
    expect((thrown as PlannerError).code).toBe(PlannerErrorCode.INVALID_INPUT);
  });

  it('passes custom policies through without interpretation', () => {
    const p = resolvePolicies({ custom: { warehouse: 'XS', flag: true } });
    expect(p.custom).toEqual({ warehouse: 'XS', flag: true });
  });
});
