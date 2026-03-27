import type { Attributes, IObservability } from '@dvt/observability';

import type {
  AdmissionDecisionRecord,
  AdmissionTelemetry,
  AdmissionTelemetryDecision,
} from '../../application/ports/AdmissionTelemetry.js';
import { ADMISSION_TELEMETRY_DECISION } from '../../application/ports/AdmissionTelemetry.js';

import { ADMISSION_TELEMETRY_METRICS } from './admissionTelemetryMetrics.js';
import { safeWarn } from './safeWarn.js';

const REJECTION_DECISIONS = new Set<AdmissionTelemetryDecision>([
  ADMISSION_TELEMETRY_DECISION.rejectTenant,
  ADMISSION_TELEMETRY_DECISION.rejectSystem,
  ADMISSION_TELEMETRY_DECISION.wouldRejectTenant,
  ADMISSION_TELEMETRY_DECISION.wouldRejectSystem,
]);

type RejectionRecord = Extract<AdmissionDecisionRecord, { readonly code: string }>;

type DecisionLogAttributes = {
  readonly requestId: string;
  readonly tenantId: string;
  readonly runId: string;
  readonly mode: string;
  readonly decision: string;
  readonly code?: string;
  readonly retryAfterSeconds?: number;
  readonly duplicateOf?: string;
};

function isRejectionRecord(event: AdmissionDecisionRecord): event is RejectionRecord {
  return REJECTION_DECISIONS.has(event.decision);
}

export class ObservabilityAdmissionTelemetry implements AdmissionTelemetry {
  private readonly decisionCounter;
  private readonly rejectionCounter;

  public constructor(
    private readonly deps: {
      readonly observability: IObservability;
    }
  ) {
    this.decisionCounter = deps.observability.metrics.counter(
      ADMISSION_TELEMETRY_METRICS.decisionTotal
    );
    this.rejectionCounter = deps.observability.metrics.counter(
      ADMISSION_TELEMETRY_METRICS.rejectionTotal
    );
  }

  public async record(event: AdmissionDecisionRecord): Promise<void> {
    try {
      this.decisionCounter.add(1, { mode: event.mode, decision: event.decision });

      if (isRejectionRecord(event)) {
        this.rejectionCounter.add(1, {
          mode: event.mode,
          decision: event.decision,
          code: event.code,
        });
        this.deps.observability.logs.warn({
          msg: 'admission.decision',
          attributes: this.toLogAttributes(event),
        });
      } else {
        this.deps.observability.logs.info({
          msg: 'admission.decision',
          attributes: this.toLogAttributes(event),
        });
      }
    } catch (err) {
      // Telemetry must not break command admission.
      safeWarn(this.deps.observability.logs, 'admission.telemetry_drop', err);
    }
  }

  private toLogAttributes(event: AdmissionDecisionRecord): Attributes {
    const attrs: DecisionLogAttributes = {
      requestId: event.requestId,
      tenantId: event.tenantId,
      runId: event.runId,
      mode: event.mode,
      decision: event.decision,
      ...('code' in event ? { code: event.code } : {}),
      ...('retryAfterSeconds' in event ? { retryAfterSeconds: event.retryAfterSeconds } : {}),
      ...('duplicateOf' in event ? { duplicateOf: event.duplicateOf } : {}),
    };
    return attrs as Attributes;
  }
}
