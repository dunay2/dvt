/**
 * Owned concern: publish the executable compatibility truth that binds
 * `ExecutionPlan.metadata.planVersion` to `ExecutionPlan.metadata.schemaVersion`.
 */
import {
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
} from './ExecutionPlan.v1.js';
import { CURRENT_EXECUTION_PLAN_VERSION, type SupportedPlanVersion } from './PlanVersion.v1.js';

export type SupportedPlanSchemaVersion = typeof CURRENT_EXECUTION_PLAN_SCHEMA_VERSION;

export interface ExecutionPlanCompatibilityPair {
  readonly planVersion: SupportedPlanVersion;
  readonly schemaVersion: SupportedPlanSchemaVersion;
}

export interface ExecutionPlanCompatibilityDescriptor extends ExecutionPlanCompatibilityPair {
  readonly contractVersion: typeof CURRENT_EXECUTION_PLAN_CONTRACT_VERSION;
  readonly status: 'current';
  readonly notes: string;
}

export const SUPPORTED_EXECUTION_PLAN_COMPATIBILITY_PAIRS = [
  {
    planVersion: CURRENT_EXECUTION_PLAN_VERSION,
    schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  },
] as const satisfies readonly ExecutionPlanCompatibilityPair[];

export const EXECUTION_PLAN_COMPATIBILITY_MATRIX = {
  [CURRENT_EXECUTION_PLAN_VERSION]: [CURRENT_EXECUTION_PLAN_SCHEMA_VERSION],
} as const satisfies Record<SupportedPlanVersion, readonly SupportedPlanSchemaVersion[]>;

export const EXECUTION_PLAN_COMPATIBILITY_REGISTRY = {
  [`${CURRENT_EXECUTION_PLAN_VERSION}:${CURRENT_EXECUTION_PLAN_SCHEMA_VERSION}`]: {
    planVersion: CURRENT_EXECUTION_PLAN_VERSION,
    schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
    contractVersion: CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
    status: 'current',
    notes: 'Current executable pair for planner-emitted ExecutionPlan records.',
  },
} as const satisfies Record<string, ExecutionPlanCompatibilityDescriptor>;

export function isSupportedExecutionPlanCompatibility(
  planVersion: string,
  schemaVersion: string
): planVersion is SupportedPlanVersion {
  const supportedSchemas =
    EXECUTION_PLAN_COMPATIBILITY_MATRIX[planVersion as SupportedPlanVersion] ?? [];

  return supportedSchemas.includes(schemaVersion as SupportedPlanSchemaVersion);
}
