import type { IObservability } from '@dvt/observability';

import {
  ADMISSION_TELEMETRY_DECISION,
  type AdmissionTelemetry,
} from '../../application/ports/AdmissionTelemetry.js';
import { ADMISSION_TELEMETRY_DECISION } from '../../application/ports/AdmissionTelemetry.js';

import {
  ADMISSION_TELEMETRY_LOG,
  ADMISSION_TELEMETRY_METRICS,
} from './admissionTelemetryMetrics.js';

type DecisionInput = Parameters<AdmissionTelemetry['recordDecision']>[0];

export class ObservabilityAdmissionTelemetry implements AdmissionTelemetry {
  public constructor(
    private readonly deps: {
      readonly observability: IObservability;
    }
  ) {}

  public async recordDecision(input: DecisionInput): Promise<void> {
    try {
      this.deps.observability.metrics
        .counter(ADMISSION_TELEMETRY_METRICS.decisionTotal)
        .add(1, { mode: input.mode, decision: input.decision });

      if (isRejectionDecision(input.decision) && input.code !== undefined) {
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
        ...(input.code === undefined ? {} : { code: input.code }),
        ...(input.retryAfterSeconds === undefined
          ? {}
          : { retryAfterSeconds: input.retryAfterSeconds }),
        ...(input.duplicateOf === undefined ? {} : { duplicateOf: input.duplicateOf }),
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
