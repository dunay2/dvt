/**
 * ADR baseline: ADR-0006-extensibility (custom passthrough) + POLICY_CONFLICT semantics.
 */
import { PlannerError, PlannerErrorCode } from './errors.js';
import type { PlannerPolicies, ResolvedPolicies } from './types.js';

const DEFAULTS: ResolvedPolicies = {
  stepTimeoutMs: 60_000,
  retries: {
    maxAttempts: 1,
    backoffMs: 0,
  },
  concurrency: {
    maxInFlight: 256,
  },
  custom: {},
};

export function resolvePolicies(policies?: PlannerPolicies): ResolvedPolicies {
  if (policies === undefined) return DEFAULTS;

  const timeout = policies.stepTimeoutMs ?? DEFAULTS.stepTimeoutMs;
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new PlannerError(
      PlannerErrorCode.INVALID_INPUT,
      'policies.stepTimeoutMs must be a positive number.'
    );
  }

  const retries = policies.retries ?? DEFAULTS.retries;
  if (!Number.isFinite(retries.maxAttempts) || retries.maxAttempts < 1) {
    throw new PlannerError(
      PlannerErrorCode.INVALID_INPUT,
      'policies.retries.maxAttempts must be >= 1.'
    );
  }
  if (!Number.isFinite(retries.backoffMs) || retries.backoffMs < 0) {
    throw new PlannerError(
      PlannerErrorCode.INVALID_INPUT,
      'policies.retries.backoffMs must be >= 0.'
    );
  }

  const conc = policies.concurrency ?? DEFAULTS.concurrency;
  if (!Number.isFinite(conc.maxInFlight) || conc.maxInFlight < 1) {
    throw new PlannerError(
      PlannerErrorCode.INVALID_INPUT,
      'policies.concurrency.maxInFlight must be >= 1.'
    );
  }

  // Example of a policy conflict placeholder (kept for future expansion):
  if (retries.maxAttempts > 1 && conc.maxInFlight <= 0) {
    throw new PlannerError(PlannerErrorCode.POLICY_CONFLICT, 'Invalid policy combination.');
  }

  return {
    stepTimeoutMs: timeout,
    retries: {
      maxAttempts: retries.maxAttempts,
      backoffMs: retries.backoffMs,
    },
    concurrency: {
      maxInFlight: conc.maxInFlight,
    },
    custom: policies.custom ?? {},
  };
}
