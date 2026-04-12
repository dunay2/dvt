import type { PlanRef, RunExecutionContextRef } from '../../types/contracts.js';
import type { ExecutionPlan, GenericGraphSourceV1 } from '../planner/ExecutionPlan.v1.js';
import type { PlannerEnvironmentContext } from '../planner/ExecutionPlan.v1.js';
import type { ExecutabilityRejectionCode } from '../planner/PlanExecutabilityValidation.v1.js';
import type { PlannerPolicyClassSet } from '../planner/PlannerPolicyVocabulary.v2.js';

/**
 * Shared API-to-engine start-run boundary.
 *
 * This contract models the public command/result surface consumed by the API
 * start-run orchestration layer before it is bridged into `IWorkflowEngine`.
 */

export const START_RUN_TARGET_ADAPTER = {
  temporal: 'temporal',
  mock: 'mock',
} as const;

export type StartRunTargetAdapter =
  (typeof START_RUN_TARGET_ADAPTER)[keyof typeof START_RUN_TARGET_ADAPTER];

export const SUPPORTED_START_RUN_TARGET_ADAPTERS: readonly StartRunTargetAdapter[] = [
  START_RUN_TARGET_ADAPTER.temporal,
  START_RUN_TARGET_ADAPTER.mock,
] as const;

export function isStartRunTargetAdapter(value: unknown): value is StartRunTargetAdapter {
  return (
    typeof value === 'string' &&
    (SUPPORTED_START_RUN_TARGET_ADAPTERS as readonly string[]).includes(value)
  );
}

export type StartRunPlanRef = PlanRef;

export type StartRunPlannerEnvironmentInput = PlannerEnvironmentContext;

export interface StartRunCommand {
  readonly planRef?: StartRunPlanRef | undefined;
  readonly runExecutionContextRef?: RunExecutionContextRef | undefined;
  readonly graphSource?: GenericGraphSourceV1 | undefined;
  readonly policies?: PlannerPolicyClassSet | undefined;
  readonly environment?: StartRunPlannerEnvironmentInput | undefined;
  readonly observability?: ExecutionPlan['observability'] | undefined;
  readonly runId: string;
  readonly targetAdapter: StartRunTargetAdapter;
  readonly selection: readonly string[];
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
} as const;

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
  readonly code:
    | typeof START_RUN_BACKPRESSURE_CODE.system
    | typeof START_RUN_BACKPRESSURE_CODE.snapshotUnavailable;
  readonly retryAfterSeconds: number;
}

export interface StartRunRateLimitedResult {
  readonly kind: typeof START_RUN_RESULT_KIND.rateLimited;
  readonly accepted: false;
  readonly code: typeof START_RUN_RATE_LIMIT_CODE.outboxExceeded;
  readonly retryAfterSeconds?: number | undefined;
}

export interface StartRunPlanRejectedResult {
  readonly kind: typeof START_RUN_RESULT_KIND.planRejected;
  readonly accepted: false;
  readonly code: ExecutabilityRejectionCode;
  readonly reason: string;
  readonly cause?: string | undefined;
  readonly supportedVersions?: readonly string[] | undefined;
}

export type StartRunResult =
  | StartRunAcceptedResult
  | StartRunDuplicateResult
  | StartRunTenantBackpressureResult
  | StartRunSystemBackpressureResult
  | StartRunRateLimitedResult
  | StartRunPlanRejectedResult;
