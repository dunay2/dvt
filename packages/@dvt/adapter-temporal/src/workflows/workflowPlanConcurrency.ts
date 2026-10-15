/**
 * @ownedConcern Plan-wide concurrency resolution from canonical step configuration
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0046: Execution Plan Definition And Run Execution Policy Separation
 * @decision Validate all steps against the shared schema and require one uniform plan-wide policy
 * @consequence Segment execution cannot silently choose an incidental step or invent a runtime default
 * @version 1.0.0
 */
import { CommonStepTypeConfigSchema, type ExecutionStep } from '@dvt/contracts';

export function resolvePlanMaxInFlight(steps: readonly ExecutionStep[]): number | undefined {
  const limits = new Set<number | undefined>();
  for (const step of steps) {
    const policy = CommonStepTypeConfigSchema.shape.concurrency.safeParse(
      step.stepTypeConfig?.['concurrency']
    );
    if (!policy.success) {
      throw new TypeError(`INVALID_PLAN_CONCURRENCY: ${step.stepId}`);
    }
    limits.add(policy.data?.maxInFlight);
  }
  if (limits.size > 1) {
    throw new TypeError('INCONSISTENT_PLAN_CONCURRENCY: all steps must share one plan-wide limit');
  }
  return limits.values().next().value;
}
