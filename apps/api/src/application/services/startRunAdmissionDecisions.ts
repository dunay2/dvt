/**
 * Owned concern: translate start-run admission signals into canonical
 * rejection results and telemetry records for the admission orchestrator.
 */
import {
  START_RUN_BACKPRESSURE_CODE,
  START_RUN_RESULT_KIND,
  type StartRunResult,
} from '@dvt/contracts';
import {
  BackpressureSnapshotUnavailableError,
  SystemBackpressureError,
  TenantBackpressureError,
} from '@dvt/delivery';

import {
  ADMISSION_TELEMETRY_DECISION,
  type AdmissionDecisionRecord,
  type AdmissionTelemetry,
} from '../ports/AdmissionTelemetry.js';
import { ADMISSION_MODE, type AdmissionMode } from '../ports/IAdmissionMode.js';
import {
  START_RUN_EXECUTION_CAPACITY_REASON,
  START_RUN_EXECUTION_CAPACITY_RESULT_KIND,
  type StartRunExecutionCapacityResult,
} from '../ports/IStartRunExecutionCapacityPort.js';
import type { StartRunUseCaseResult } from '../ports/startRunUseCasePort.js';

export type AdmissionRejectResult = Extract<
  StartRunResult,
  {
    readonly kind:
      | typeof START_RUN_RESULT_KIND.tenantBackpressure
      | typeof START_RUN_RESULT_KIND.systemBackpressure;
  }
>;

type DelegateTelemetryResult = Extract<
  StartRunResult,
  {
    readonly kind: typeof START_RUN_RESULT_KIND.accepted | typeof START_RUN_RESULT_KIND.duplicate;
  }
>;

type AdmissionTelemetryContext = {
  readonly requestId: string;
  readonly tenantId: string;
  readonly runId: string;
};

export function toGuardAdmissionRejectResult(
  error: unknown,
  retryAfterSeconds: number
): AdmissionRejectResult | null {
  if (error instanceof TenantBackpressureError) {
    return {
      kind: START_RUN_RESULT_KIND.tenantBackpressure,
      accepted: false,
      code: START_RUN_BACKPRESSURE_CODE.tenant,
      retryAfterSeconds,
    };
  }
  if (error instanceof SystemBackpressureError) {
    return {
      kind: START_RUN_RESULT_KIND.systemBackpressure,
      accepted: false,
      code: START_RUN_BACKPRESSURE_CODE.system,
      retryAfterSeconds,
    };
  }
  if (error instanceof BackpressureSnapshotUnavailableError) {
    return {
      kind: START_RUN_RESULT_KIND.systemBackpressure,
      accepted: false,
      code: START_RUN_BACKPRESSURE_CODE.snapshotUnavailable,
      retryAfterSeconds,
    };
  }

  return null;
}

export function toExecutionCapacityRejectResult(
  result: StartRunExecutionCapacityResult,
  fallbackRetryAfterSeconds: number
): AdmissionRejectResult | null {
  if (result.kind === START_RUN_EXECUTION_CAPACITY_RESULT_KIND.admissible) {
    return null;
  }
  return {
    kind: START_RUN_RESULT_KIND.systemBackpressure,
    accepted: false,
    code: mapExecutionCapacityReason(result.reason),
    retryAfterSeconds: result.retryAfterSeconds ?? fallbackRetryAfterSeconds,
  };
}

export function buildAdmissionRejectionRecord(
  reject: AdmissionRejectResult,
  mode: AdmissionMode,
  context: AdmissionTelemetryContext
): AdmissionDecisionRecord {
  const base = buildTelemetryBase(mode, context);
  const isObserve = mode === ADMISSION_MODE.observe;

  if (reject.kind === START_RUN_RESULT_KIND.tenantBackpressure) {
    return {
      ...base,
      decision: isObserve
        ? ADMISSION_TELEMETRY_DECISION.wouldRejectTenant
        : ADMISSION_TELEMETRY_DECISION.rejectTenant,
      code: reject.code,
      retryAfterSeconds: reject.retryAfterSeconds,
    };
  }

  return {
    ...base,
    decision: isObserve
      ? ADMISSION_TELEMETRY_DECISION.wouldRejectSystem
      : ADMISSION_TELEMETRY_DECISION.rejectSystem,
    code: reject.code,
    retryAfterSeconds: reject.retryAfterSeconds,
  };
}

export async function recordAdmissionTelemetry(
  telemetry: AdmissionTelemetry,
  event: AdmissionDecisionRecord
): Promise<void> {
  try {
    await telemetry.record(event);
  } catch {
    // Telemetry must not break command admission.
  }
}

export async function recordDelegateDecisionIfNeeded(
  telemetry: AdmissionTelemetry,
  mode: AdmissionMode,
  result: StartRunUseCaseResult,
  context: AdmissionTelemetryContext
): Promise<void> {
  if (!isDelegateTelemetryResult(result)) {
    return;
  }
  const base = buildTelemetryBase(mode, context);
  if (result.value.kind === START_RUN_RESULT_KIND.duplicate) {
    await recordAdmissionTelemetry(telemetry, {
      ...base,
      decision: ADMISSION_TELEMETRY_DECISION.duplicate,
      duplicateOf: result.value.duplicateOf,
    });
    return;
  }

  await recordAdmissionTelemetry(telemetry, {
    ...base,
    decision: ADMISSION_TELEMETRY_DECISION.accept,
  });
}

function buildTelemetryBase(
  mode: AdmissionMode,
  context: AdmissionTelemetryContext
): { requestId: string; tenantId: string; runId: string; mode: AdmissionMode } {
  return { ...context, mode };
}

function mapExecutionCapacityReason(
  reason: Extract<
    StartRunExecutionCapacityResult,
    { readonly kind: typeof START_RUN_EXECUTION_CAPACITY_RESULT_KIND.saturated }
  >['reason']
):
  | typeof START_RUN_BACKPRESSURE_CODE.executionCapacityExhausted
  | typeof START_RUN_BACKPRESSURE_CODE.executorUnavailable
  | typeof START_RUN_BACKPRESSURE_CODE.capacitySignalUnavailable {
  switch (reason) {
    case START_RUN_EXECUTION_CAPACITY_REASON.capacityExhausted:
      return START_RUN_BACKPRESSURE_CODE.executionCapacityExhausted;
    case START_RUN_EXECUTION_CAPACITY_REASON.executorUnavailable:
      return START_RUN_BACKPRESSURE_CODE.executorUnavailable;
    case START_RUN_EXECUTION_CAPACITY_REASON.capacitySignalUnavailable:
      return START_RUN_BACKPRESSURE_CODE.capacitySignalUnavailable;
  }
}

function isDelegateTelemetryResult(
  result: StartRunUseCaseResult
): result is { readonly ok: true; readonly value: DelegateTelemetryResult } {
  return (
    result.ok &&
    (result.value.kind === START_RUN_RESULT_KIND.accepted ||
      result.value.kind === START_RUN_RESULT_KIND.duplicate)
  );
}
