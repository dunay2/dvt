import { z } from 'zod';

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
 * policy. This is the local typed error until the full executability result
 * contract is canonized.
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
