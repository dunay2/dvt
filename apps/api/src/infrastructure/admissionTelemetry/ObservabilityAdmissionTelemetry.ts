/**
 * Owned concern: translate canonical admission decision records into bounded
 * observability counters and structured logs.
 */
import type { IObservability } from '@dvt/observability';

import {
  ADMISSION_TELEMETRY_DECISION,
  type AdmissionTelemetry,
} from '../../application/ports/AdmissionTelemetry.js';

import {
  ADMISSION_TELEMETRY_LOG,
  ADMISSION_TELEMETRY_METRICS,
} from './admissionTelemetryMetrics.js';

type DecisionInput = Parameters<AdmissionTelemetry['record']>[0];

export class ObservabilityAdmissionTelemetry implements AdmissionTelemetry {
  public constructor(
    private readonly deps: {
      readonly observability: IObservability;
    }
  ) {}

  public async record(input: DecisionInput): Promise<void> {
    try {
      this.deps.observability.metrics
        .counter(ADMISSION_TELEMETRY_METRICS.decisionTotal)
        .add(1, { mode: input.mode, decision: input.decision });

      if (hasRejectionCode(input)) {
        this.deps.observability.metrics
          .counter(ADMISSION_TELEMETRY_METRICS.rejectionTotal)
          .add(1, { mode: input.mode, decision: input.decision, code: input.code });
      }

      const attributes = {
        requestId: input.requestId,
        tenantId: input.tenantId,
        runId: input.runId,
        mode: input.mode,
        decision: input.decision,
        ...(hasRejectionCode(input) ? { code: input.code } : {}),
        ...(hasRetryAfterSeconds(input) ? { retryAfterSeconds: input.retryAfterSeconds } : {}),
        ...(hasDuplicateOf(input) ? { duplicateOf: input.duplicateOf } : {}),
      };

      if (isWarningDecision(input.decision)) {
        this.deps.observability.logs.warn({
          msg: ADMISSION_TELEMETRY_LOG.decision,
          attributes,
        });
        return;
      }

      this.deps.observability.logs.info({
        msg: ADMISSION_TELEMETRY_LOG.decision,
        attributes,
      });
    } catch {
      // Telemetry must not break admission flow.
    }
  }
}

function isRejectionDecision(decision: DecisionInput['decision']): boolean {
  return (
    decision === ADMISSION_TELEMETRY_DECISION.rejectTenant ||
    decision === ADMISSION_TELEMETRY_DECISION.rejectSystem ||
    decision === ADMISSION_TELEMETRY_DECISION.wouldRejectTenant ||
    decision === ADMISSION_TELEMETRY_DECISION.wouldRejectSystem
  );
}

function isWarningDecision(decision: DecisionInput['decision']): boolean {
  return isRejectionDecision(decision);
}

function hasRejectionCode(
  input: DecisionInput
): input is DecisionInput & { readonly code: string } {
  return 'code' in input;
}

function hasRetryAfterSeconds(
  input: DecisionInput
): input is DecisionInput & { readonly retryAfterSeconds: number } {
  return 'retryAfterSeconds' in input;
}

function hasDuplicateOf(
  input: DecisionInput
): input is DecisionInput & { readonly duplicateOf: string } {
  return 'duplicateOf' in input;
}
