import type { Attributes, IObservability } from '@dvt/observability';

import type {
  AdmissionDecisionRecord,
  AdmissionTelemetry,
} from '../../application/ports/AdmissionTelemetry.js';

import { ADMISSION_TELEMETRY_METRICS } from './admissionTelemetryMetrics.js';

const REJECTION_DECISIONS = new Set([
  'reject_tenant',
  'reject_system',
  'would_reject_tenant',
  'would_reject_system',
]);

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

      if (REJECTION_DECISIONS.has(event.decision)) {
        const rejection = event as Extract<
          AdmissionDecisionRecord,
          { readonly code: string; readonly retryAfterSeconds: number }
        >;
        this.rejectionCounter.add(1, {
          mode: event.mode,
          decision: event.decision,
          code: rejection.code,
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
      // Secondary try/catch: if the logger itself throws, swallow silently.
      try {
        this.deps.observability.logs.warn({
          msg: 'admission.telemetry_drop',
          attributes: { error: String(err) },
        });
      } catch {
        // Logger unavailable — ignore silently.
      }
    }
  }

  private toLogAttributes(event: AdmissionDecisionRecord): Attributes {
    const attrs: Record<string, string | number> = {
      requestId: event.requestId,
      tenantId: event.tenantId,
      runId: event.runId,
      mode: event.mode,
      decision: event.decision,
    };

    if ('code' in event) {
      attrs['code'] = event.code;
    }
    if ('retryAfterSeconds' in event) {
      attrs['retryAfterSeconds'] = event.retryAfterSeconds;
    }
    if ('duplicateOf' in event) {
      attrs['duplicateOf'] = event.duplicateOf;
    }

    return attrs;
  }
}
