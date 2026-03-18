import { z } from 'zod';

import type { ExecutabilityValidationResult } from './PlanExecutabilityValidation.v1.js';

// ── Migration compatibility note ──────────────────────────────────────────────
//
// Stage 1.1 (Slice 2, commit 76ea442) removed the old raw-numeric PlannerPolicies
// type from the public planner boundary. Callers that previously passed:
//
//   policies: { stepTimeoutMs: 60_000, maxRetries: 3, backoffMs: 1_000 }
//
// must migrate to the canonical class vocabulary:
//
//   policies: {
//     timeout:     { kind: 'budget',     maxSeconds: 60 },
//     retry:       { kind: 'at-most-N',  maxAttempts: 4 },  // 1 initial + 3 retries
//     concurrency: { kind: 'bounded',    maxParallel: N },   // if applicable
//   }
//
// Notes:
//  - `stepTimeoutMs` maps to `timeout.kind='budget', maxSeconds = stepTimeoutMs / 1000`.
//  - `maxRetries` maps to `retry.kind='at-most-N', maxAttempts = maxRetries + 1`
//    (canonical maxAttempts counts total attempts including the first execution).
//  - `backoffMs` has no direct mapping — the adapter owns backoff strategy.
//    `at-most-N` uses the adapter's default backoff (exponential for Temporal).
//  - `maxInFlight` / numeric concurrency maps to `concurrency.kind='bounded',
//    maxParallel = maxInFlight`.
//  - Omitting a class means no constraint is applied for that dimension.
//
// The removed schema artifacts are:
//  - PlannerPoliciesSchema (use PlannerPolicyClassSetSchema)
//  - parsePlannerPolicies  (use parsePlannerPolicyClassSet from validation.ts)
//  - PlannerPolicies.v2.schema.json (replaced by PlannerPolicyClassSet.v2.schema.json)
//
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonical retry vocabulary for planner-authored runtime-neutral policy.
 *
 * `maxAttempts` counts total attempts, including the initial execution.
 */
export const MAX_RETRY_POLICY_ATTEMPTS = 20;

export const RetryPolicySchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('at-most-once'),
    })
    .strict(),
  z
    .object({
      kind: z.literal('at-most-N'),
      maxAttempts: z.number().int().min(2).max(MAX_RETRY_POLICY_ATTEMPTS),
    })
    .strict(),
]);

/**
 * Canonical timeout vocabulary for planner-authored runtime-neutral policy.
 *
 * Stage 1.1 models a single end-to-end execution budget, not separate
 * scheduling and execution timeout classes.
 */
export const TimeoutPolicySchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('unbounded'),
    })
    .strict(),
  z
    .object({
      kind: z.literal('budget'),
      maxSeconds: z.number().int().positive(),
    })
    .strict(),
]);

/**
 * Canonical concurrency vocabulary for planner-authored runtime-neutral policy.
 *
 * Stage 1.1 models concurrency as a plan-wide execution limit, not a
 * per-step-kind override matrix.
 */
export const ConcurrencyPolicySchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('sequential'),
    })
    .strict(),
  z
    .object({
      kind: z.literal('bounded'),
      maxParallel: z.number().int().min(2),
    })
    .strict(),
  z
    .object({
      kind: z.literal('unbounded'),
    })
    .strict(),
]);

export type RetryPolicy = z.infer<typeof RetryPolicySchema>;
export type TimeoutPolicy = z.infer<typeof TimeoutPolicySchema>;
export type ConcurrencyPolicy = z.infer<typeof ConcurrencyPolicySchema>;

export const PlannerPolicyClassSetSchema = z
  .object({
    retry: RetryPolicySchema.optional(),
    timeout: TimeoutPolicySchema.optional(),
    concurrency: ConcurrencyPolicySchema.optional(),
  })
  .strict();

export type PlannerPolicyClassSet = z.infer<typeof PlannerPolicyClassSetSchema>;
export type PlannerPolicyClassSetSchemaT = PlannerPolicyClassSet;

export type PlannerPolicyCategory = 'retry' | 'timeout' | 'concurrency';

export type PlannerPolicyValue = RetryPolicy | TimeoutPolicy | ConcurrencyPolicy;

export interface UnsupportedPlannerPolicyDetails<
  TPolicy extends PlannerPolicyValue = PlannerPolicyValue,
> {
  adapterId?: string;
  policyType: PlannerPolicyCategory;
  policy: TPolicy;
  reason: string;
}

/**
 * Typed failure for adapters that cannot faithfully honor a canonical planner
 * policy.
 *
 * Throw this from `AdapterPolicyMapper` method implementations when a canonical
 * policy class cannot be mapped to a runtime enforcement shape. The executability
 * gate converts it to `ExecutabilityValidationResult { code: 'POLICY_UNSUPPORTED' }`
 * via `policyErrorToExecutabilityResult`.
 */
export class UnsupportedPlannerPolicyError<
  TPolicy extends PlannerPolicyValue = PlannerPolicyValue,
> extends Error {
  readonly code = 'UNSUPPORTED_PLANNER_POLICY';

  constructor(readonly details: UnsupportedPlannerPolicyDetails<TPolicy>) {
    super(
      `${details.adapterId ?? 'adapter'} cannot map ${details.policyType} policy ${details.policy.kind}: ${details.reason}`
    );
    this.name = 'UnsupportedPlannerPolicyError';
  }
}

/**
 * Required adapter mapping boundary from canonical planner policy vocabulary to
 * runtime-specific enforcement config.
 */
export interface AdapterPolicyMapper<TRetry, TTimeout, TConcurrency> {
  mapRetry(policy: RetryPolicy): TRetry;
  mapTimeout(policy: TimeoutPolicy): TTimeout;
  mapConcurrency(policy: ConcurrencyPolicy): TConcurrency;
}

// ── Executability result integration ─────────────────────────────────────────

/**
 * Converts an `UnsupportedPlannerPolicyError` thrown by an adapter's policy
 * mapper into the canonical `ExecutabilityValidationResult` with
 * `code: 'POLICY_UNSUPPORTED'`.
 *
 * ### Usage
 *
 * Adapters that implement `AdapterPolicyMapper` should catch
 * `UnsupportedPlannerPolicyError` in their `IPlanExecutabilityValidator`
 * implementation and delegate to this function rather than constructing the
 * result shape manually:
 *
 * ```ts
 * try {
 *   mapper.mapRetry(plan.policies.retry);
 * } catch (err) {
 *   if (err instanceof UnsupportedPlannerPolicyError) {
 *     return policyErrorToExecutabilityResult(err, planRef.planId, adapterId);
 *   }
 *   throw err;
 * }
 * ```
 *
 * @param err       - The caught `UnsupportedPlannerPolicyError`.
 * @param planId    - Canonical plan identifier from the `PlanRef`.
 * @param adapterId - Target adapter identifier (e.g. `'temporal'`).
 */
export function policyErrorToExecutabilityResult(
  err: UnsupportedPlannerPolicyError,
  planId: string,
  adapterId: string
): ExecutabilityValidationResult & { status: 'ERROR' } {
  return {
    status: 'ERROR',
    planId,
    adapterId,
    code: 'POLICY_UNSUPPORTED',
    degradable: false,
    reason: err.message,
    cause: `${err.details.policyType}:${err.details.policy.kind}`,
  };
}
