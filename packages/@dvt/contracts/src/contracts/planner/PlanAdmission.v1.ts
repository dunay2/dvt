/**
 * Owned concern: publish the executable admission truth that binds
 * `ExecutionPlan.metadata.planVersion` to `ExecutionPlan.metadata.schemaVersion`.
 *
 * @baseline ADR-0036: ExecutionPlan PlanVersion Registry And Runtime Compatibility Matrix
 * @baseline ADR-0046: Execution Plan Definition And Run Execution Policy Separation
 * @decision Publish admitted planVersion/schemaVersion pairs as executable shared-kernel contract data.
 * @consequence Runtime ingress rejects unsupported plan pairs from one canonical matrix.
 * @version 1.0.0
 */
import {
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
} from './ExecutionPlan.v1.js';
import { CURRENT_EXECUTION_PLAN_VERSION, type SupportedPlanVersion } from './PlanVersion.v1.js';

export type SupportedPlanSchemaVersion = typeof CURRENT_EXECUTION_PLAN_SCHEMA_VERSION;

export interface ExecutionPlanAdmissionPair {
  readonly planVersion: SupportedPlanVersion;
  readonly schemaVersion: SupportedPlanSchemaVersion;
}

export interface ExecutionPlanAdmissionDescriptor extends ExecutionPlanAdmissionPair {
  readonly contractVersion: typeof CURRENT_EXECUTION_PLAN_CONTRACT_VERSION;
  readonly status: 'current';
  readonly notes: string;
}

export const SUPPORTED_EXECUTION_PLAN_ADMISSION_PAIRS = [
  {
    planVersion: CURRENT_EXECUTION_PLAN_VERSION,
    schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  },
] as const satisfies readonly ExecutionPlanAdmissionPair[];

export const EXECUTION_PLAN_ADMISSION_MATRIX = {
  [CURRENT_EXECUTION_PLAN_VERSION]: [CURRENT_EXECUTION_PLAN_SCHEMA_VERSION],
} as const satisfies Record<SupportedPlanVersion, readonly SupportedPlanSchemaVersion[]>;

export const EXECUTION_PLAN_ADMISSION_REGISTRY = {
  [`${CURRENT_EXECUTION_PLAN_VERSION}:${CURRENT_EXECUTION_PLAN_SCHEMA_VERSION}`]: {
    planVersion: CURRENT_EXECUTION_PLAN_VERSION,
    schemaVersion: CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
    contractVersion: CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
    status: 'current',
    notes: 'Current executable pair for planner-emitted ExecutionPlan records.',
  },
} as const satisfies Record<string, ExecutionPlanAdmissionDescriptor>;

export function isAdmittedExecutionPlanPair(
  planVersion: string,
  schemaVersion: string
): planVersion is SupportedPlanVersion {
  if (!isSupportedPlanVersionKey(planVersion)) {
    return false;
  }

  const admittedSchemas = EXECUTION_PLAN_ADMISSION_MATRIX[planVersion];

  return admittedSchemas.includes(schemaVersion as SupportedPlanSchemaVersion);
}

function isSupportedPlanVersionKey(planVersion: string): planVersion is SupportedPlanVersion {
  return Object.prototype.hasOwnProperty.call(EXECUTION_PLAN_ADMISSION_MATRIX, planVersion);
}
