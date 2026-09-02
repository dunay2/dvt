/**
 * Owned concern: define the canonical API-to-engine start-run boundary.
 *
 * This module owns the shared command/result vocabulary consumed by schema
 * packs, runtime validation, fixtures, and API orchestration layers.
 */
import type { PlanRef, RunExecutionContextRef } from '../../types/contracts.js';
import type { ExecutionPlan, GenericGraphSourceV1 } from '../planner/ExecutionPlan.v1.js';
import type { ExecutionSelection } from '../planner/ExecutionSelection.v1.js';
import type { ExecutabilityRejectionCode } from '../planner/PlanExecutabilityValidation.v1.js';
import type { PlannerPolicyClassSet } from '../planner/PlannerPolicyVocabulary.v2.js';

export const START_RUN_TARGET_ADAPTER = {
  temporal: 'temporal',
} as const;

export type StartRunTargetAdapter =
  (typeof START_RUN_TARGET_ADAPTER)[keyof typeof START_RUN_TARGET_ADAPTER];

export const SUPPORTED_START_RUN_TARGET_ADAPTERS: readonly StartRunTargetAdapter[] = [
  START_RUN_TARGET_ADAPTER.temporal,
] as const;

export function isStartRunTargetAdapter(value: unknown): value is StartRunTargetAdapter {
  return (
    typeof value === 'string' &&
    (SUPPORTED_START_RUN_TARGET_ADAPTERS as readonly string[]).includes(value)
  );
}

export type StartRunPlanRef = PlanRef;

export interface StartRunCommand {
  readonly planRef?: StartRunPlanRef;
  readonly runExecutionContextRef?: RunExecutionContextRef;
  readonly graphSource?: GenericGraphSourceV1;
  readonly policies?: PlannerPolicyClassSet;
  readonly observability?: ExecutionPlan['observability'];
  readonly runId: string;
  readonly targetAdapter: StartRunTargetAdapter;
  readonly selection: ExecutionSelection;
}

export const START_RUN_RESULT_KIND = {
  accepted: 'accepted',
  duplicate: 'duplicate',
  tenantBackpressure: 'tenant_backpressure',
  systemBackpressure: 'system_backpressure',
  rateLimited: 'rate_limited',
  planRejected: 'plan_rejected',
} as const;

export const START_RUN_DUPLICATE_OF = {
  run: 'run',
  intent: 'intent',
} as const;

export const START_RUN_BACKPRESSURE_CODE = {
  tenant: 'TENANT_BACKPRESSURE',
  system: 'SYSTEM_BACKPRESSURE',
  snapshotUnavailable: 'BACKPRESSURE_SNAPSHOT_UNAVAILABLE',
  executionCapacityExhausted: 'EXECUTION_CAPACITY_EXHAUSTED',
  executorUnavailable: 'EXECUTOR_UNAVAILABLE',
  capacitySignalUnavailable: 'CAPACITY_SIGNAL_UNAVAILABLE',
} as const;

export const START_RUN_INFRASTRUCTURE_SYSTEM_BACKPRESSURE_CODES = [
  START_RUN_BACKPRESSURE_CODE.system,
  START_RUN_BACKPRESSURE_CODE.snapshotUnavailable,
] as const;

export const START_RUN_EXECUTION_CAPACITY_SYSTEM_BACKPRESSURE_CODES = [
  START_RUN_BACKPRESSURE_CODE.executionCapacityExhausted,
  START_RUN_BACKPRESSURE_CODE.executorUnavailable,
  START_RUN_BACKPRESSURE_CODE.capacitySignalUnavailable,
] as const;

export const START_RUN_SYSTEM_BACKPRESSURE_CODES = [
  ...START_RUN_INFRASTRUCTURE_SYSTEM_BACKPRESSURE_CODES,
  ...START_RUN_EXECUTION_CAPACITY_SYSTEM_BACKPRESSURE_CODES,
] as const;

export const START_RUN_RATE_LIMIT_CODE = {
  outboxExceeded: 'OUTBOX_RATE_LIMIT_EXCEEDED',
} as const;

export const START_RUN_PLAN_REJECTION_CODE = {
  unsupportedPlanVersion: 'UNSUPPORTED_PLAN_VERSION',
  rejected: 'REJECTED',
} as const;

export function formatUnsupportedPlanVersionReason(planVersion: string): string {
  return `Unsupported plan version: ${planVersion}`;
}

export interface StartRunAcceptedResult {
  readonly kind: typeof START_RUN_RESULT_KIND.accepted;
  readonly runId: string;
  readonly accepted: true;
}

export interface StartRunDuplicateResult {
  readonly kind: typeof START_RUN_RESULT_KIND.duplicate;
  readonly runId: string;
  readonly accepted: true;
  readonly duplicateOf: (typeof START_RUN_DUPLICATE_OF)[keyof typeof START_RUN_DUPLICATE_OF];
}

export interface StartRunTenantBackpressureResult {
  readonly kind: typeof START_RUN_RESULT_KIND.tenantBackpressure;
  readonly accepted: false;
  readonly code: typeof START_RUN_BACKPRESSURE_CODE.tenant;
  readonly retryAfterSeconds: number;
}

export interface StartRunSystemBackpressureResult {
  readonly kind: typeof START_RUN_RESULT_KIND.systemBackpressure;
  readonly accepted: false;
  readonly code: StartRunSystemBackpressureCode;
  readonly retryAfterSeconds: number;
}

export interface StartRunRateLimitedResult {
  readonly kind: typeof START_RUN_RESULT_KIND.rateLimited;
  readonly accepted: false;
  readonly code: typeof START_RUN_RATE_LIMIT_CODE.outboxExceeded;
  readonly retryAfterSeconds?: number;
}

export interface StartRunPlanRejectedResult {
  readonly kind: typeof START_RUN_RESULT_KIND.planRejected;
  readonly accepted: false;
  readonly code: ExecutabilityRejectionCode;
  readonly reason: string;
  readonly cause?: string;
  readonly supportedVersions?: readonly string[];
}

export type StartRunResult =
  | StartRunAcceptedResult
  | StartRunDuplicateResult
  | StartRunTenantBackpressureResult
  | StartRunSystemBackpressureResult
  | StartRunRateLimitedResult
  | StartRunPlanRejectedResult;

export type StartRunSystemBackpressureCode = (typeof START_RUN_SYSTEM_BACKPRESSURE_CODES)[number];

export type StartRunExecutionCapacitySystemBackpressureCode =
  (typeof START_RUN_EXECUTION_CAPACITY_SYSTEM_BACKPRESSURE_CODES)[number];
