/**
 * Governed ExecutionPlan version vocabulary.
 *
 * New plan versions extend this registry instead of replacing inline string
 * literals across the contract surface.
 */

export const CURRENT_EXECUTION_PLAN_VERSION = '1.0' as const;

export const SUPPORTED_EXECUTION_PLAN_VERSIONS = [CURRENT_EXECUTION_PLAN_VERSION] as const;

export type SupportedPlanVersion = (typeof SUPPORTED_EXECUTION_PLAN_VERSIONS)[number];

export interface ExecutionPlanVersionDescriptor {
  readonly status: 'current';
  readonly family: 'ExecutionPlan';
  readonly notes: string;
}

export const EXECUTION_PLAN_VERSION_REGISTRY = {
  '1.0': {
    status: 'current',
    family: 'ExecutionPlan',
    notes: 'Current planner-emitted version for the canonical ExecutionPlan surface.',
  },
} as const satisfies Record<SupportedPlanVersion, ExecutionPlanVersionDescriptor>;

export function isSupportedExecutionPlanVersion(value: string): value is SupportedPlanVersion {
  return value in EXECUTION_PLAN_VERSION_REGISTRY;
}
