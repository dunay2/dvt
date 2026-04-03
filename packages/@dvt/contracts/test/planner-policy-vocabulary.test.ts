import { describe, expect, it } from 'vitest';

import {
  CONTRACTS_ERROR_CODE,
  CONTRACTS_ERROR_MESSAGE_KEY,
  ConcurrencyPolicySchema,
  MAX_RETRY_POLICY_ATTEMPTS,
  PlannerPolicyClassSetSchema,
  RetryPolicySchema,
  TimeoutPolicySchema,
  UnsupportedPlannerPolicyError,
} from '../src/index.js';

describe('contracts: planner policy vocabulary', () => {
  it('exports retry policy schema from @dvt/contracts root barrel', () => {
    expect(RetryPolicySchema.safeParse({ kind: 'at-most-once' }).success).toBe(true);
    expect(
      RetryPolicySchema.safeParse({
        kind: 'at-most-N',
        maxAttempts: MAX_RETRY_POLICY_ATTEMPTS,
      }).success
    ).toBe(true);
  });

  it('rejects invalid retry policies', () => {
    expect(RetryPolicySchema.safeParse({ kind: 'at-most-N', maxAttempts: 1 }).success).toBe(false);
    expect(
      RetryPolicySchema.safeParse({
        kind: 'at-most-N',
        maxAttempts: MAX_RETRY_POLICY_ATTEMPTS + 1,
      }).success
    ).toBe(false);
  });

  it('validates timeout policies', () => {
    expect(TimeoutPolicySchema.safeParse({ kind: 'unbounded' }).success).toBe(true);
    expect(
      TimeoutPolicySchema.safeParse({
        kind: 'budget',
        maxSeconds: 1800,
      }).success
    ).toBe(true);
    expect(
      TimeoutPolicySchema.safeParse({
        kind: 'budget',
        maxSeconds: 0,
      }).success
    ).toBe(false);
  });

  it('validates concurrency policies', () => {
    expect(ConcurrencyPolicySchema.safeParse({ kind: 'sequential' }).success).toBe(true);
    expect(
      ConcurrencyPolicySchema.safeParse({
        kind: 'bounded',
        maxParallel: 8,
      }).success
    ).toBe(true);
    expect(
      ConcurrencyPolicySchema.safeParse({
        kind: 'bounded',
        maxParallel: 1,
      }).success
    ).toBe(false);
    expect(ConcurrencyPolicySchema.safeParse({ kind: 'unbounded' }).success).toBe(true);
  });

  it('validates an aggregated planner policy class set', () => {
    const result = PlannerPolicyClassSetSchema.safeParse({
      retry: { kind: 'at-most-N', maxAttempts: 3 },
      timeout: { kind: 'budget', maxSeconds: 1200 },
      concurrency: { kind: 'bounded', maxParallel: 4 },
    });

    expect(result.success).toBe(true);
  });

  it('uses structured metadata for unsupported planner policy errors', () => {
    const error = new UnsupportedPlannerPolicyError({
      adapterId: 'temporal',
      policyType: 'retry',
      policy: { kind: 'at-most-N', maxAttempts: 3 },
      reason: 'unsupported backoff strategy',
    });

    expect(error.code).toBe(CONTRACTS_ERROR_CODE.UNSUPPORTED_PLANNER_POLICY);
    expect(error.messageKey).toBe(CONTRACTS_ERROR_MESSAGE_KEY.UNSUPPORTED_PLANNER_POLICY);
    expect(error.messageParams).toEqual({
      adapterId: 'temporal',
      policyType: 'retry',
      policyKind: 'at-most-N',
      reason: 'unsupported backoff strategy',
    });
    expect(error.message).toBe(
      'Unsupported planner policy for temporal: retry.at-most-N (unsupported backoff strategy)'
    );
  });
});
