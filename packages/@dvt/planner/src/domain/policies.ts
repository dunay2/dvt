/**
 * ADR baseline: ADR-0006-extensibility (custom passthrough) + POLICY_CONFLICT semantics.
 */
import type { PlannerPolicyClassSet } from '@dvt/contracts';

import { PlannerError, PlannerErrorCode } from './errors.js';
import type { ResolvedPolicies } from './types.js';

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_RETRY_POLICY: NonNullable<ResolvedPolicies['retryPolicy']> = {
  maxAttempts: 1,
  initialInterval: '1s',
  maximumInterval: '60s',
  backoffCoefficient: 2,
};
const DEFAULT_CONCURRENCY: NonNullable<ResolvedPolicies['concurrency']> = {
  maxInFlight: 256,
};

export function resolvePolicies(policies?: PlannerPolicyClassSet): ResolvedPolicies {
  if (policies === undefined) {
    return {
      stepTimeoutMs: DEFAULT_TIMEOUT_MS,
      retryPolicy: DEFAULT_RETRY_POLICY,
      concurrency: DEFAULT_CONCURRENCY,
    };
  }

  let timeout: number | undefined = DEFAULT_TIMEOUT_MS;
  if (policies.timeout?.kind === 'unbounded') {
    timeout = undefined;
  } else if (policies.timeout?.kind === 'budget') {
    timeout = policies.timeout.maxSeconds * 1000;
  }

  let retryPolicy: NonNullable<ResolvedPolicies['retryPolicy']> = DEFAULT_RETRY_POLICY;
  if (policies.retry?.kind === 'at-most-once') {
    retryPolicy = {
      maxAttempts: 1,
      initialInterval: '1s',
      maximumInterval: '60s',
      backoffCoefficient: 2,
    };
  } else if (policies.retry?.kind === 'at-most-N') {
    retryPolicy = {
      maxAttempts: policies.retry.maxAttempts,
      initialInterval: '1s',
      maximumInterval: '60s',
      backoffCoefficient: 2,
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
  if (concurrency !== undefined && retryPolicy.maxAttempts > 1 && concurrency.maxInFlight <= 0) {
    throw new PlannerError(PlannerErrorCode.POLICY_CONFLICT, 'Invalid policy combination.');
  }

  return {
    ...(timeout === undefined ? {} : { stepTimeoutMs: timeout }),
    retryPolicy,
    ...(concurrency === undefined ? {} : { concurrency }),
  };
}
