/**
 * ADR baseline: ADR-0006-extensibility (custom passthrough) + POLICY_CONFLICT semantics.
 */
import type { PlannerPolicyClassSet } from '@dvt/contracts';

import { PlannerError, PlannerErrorCode } from './errors.js';
import type { ResolvedPolicies } from './types.js';

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_RETRIES: NonNullable<ResolvedPolicies['retries']> = {
  maxAttempts: 1,
  backoffMs: 0,
};
const DEFAULT_CONCURRENCY: NonNullable<ResolvedPolicies['concurrency']> = {
  maxInFlight: 256,
};

export function resolvePolicies(policies?: PlannerPolicyClassSet): ResolvedPolicies {
  if (policies === undefined) {
    return {
      stepTimeoutMs: DEFAULT_TIMEOUT_MS,
      retries: DEFAULT_RETRIES,
      concurrency: DEFAULT_CONCURRENCY,
    };
  }

  let timeout: number | undefined = DEFAULT_TIMEOUT_MS;
  if (policies.timeout?.kind === 'unbounded') {
    timeout = undefined;
  } else if (policies.timeout?.kind === 'budget') {
    timeout = policies.timeout.maxSeconds * 1000;
  }

  let retries: NonNullable<ResolvedPolicies['retries']> = DEFAULT_RETRIES;
  if (policies.retry?.kind === 'at-most-once') {
    retries = {
      maxAttempts: 1,
      backoffMs: 0,
    };
  } else if (policies.retry?.kind === 'at-most-N') {
    retries = {
      maxAttempts: policies.retry.maxAttempts,
      backoffMs: 0,
    };
  }

  let concurrency: ResolvedPolicies['concurrency'] = DEFAULT_CONCURRENCY;
  if (policies.concurrency?.kind === 'sequential') {
    concurrency = { maxInFlight: 1 };
  } else if (policies.concurrency?.kind === 'bounded') {
    concurrency = { maxInFlight: policies.concurrency.maxParallel };
  } else if (policies.concurrency?.kind === 'unbounded') {
    concurrency = undefined;
  }

  // Example of a policy conflict placeholder (kept for future expansion):
  if (concurrency !== undefined && retries.maxAttempts > 1 && concurrency.maxInFlight <= 0) {
    throw new PlannerError(PlannerErrorCode.POLICY_CONFLICT, 'Invalid policy combination.');
  }

  return {
    ...(timeout !== undefined ? { stepTimeoutMs: timeout } : {}),
    retries,
    ...(concurrency !== undefined ? { concurrency } : {}),
  };
}
