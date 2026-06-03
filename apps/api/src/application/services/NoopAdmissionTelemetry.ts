/**
 * Owned concern: provide the inert admission-telemetry sink used when callers
 * need the port contract without any observability side effects.
 */
import type { AdmissionDecisionRecord, AdmissionTelemetry } from '../ports/AdmissionTelemetry.js';

export class NoopAdmissionTelemetry implements AdmissionTelemetry {
  public async record(_event: AdmissionDecisionRecord): Promise<void> {
    return undefined;
  }
}
