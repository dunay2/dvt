import type { ExecutabilityRejectionCode } from '@dvt/contracts';

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
