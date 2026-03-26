import type { AdmissionDecisionRecord, AdmissionTelemetry } from '../ports/AdmissionTelemetry.js';

export class NoopAdmissionTelemetry implements AdmissionTelemetry {
  public async record(_event: AdmissionDecisionRecord): Promise<void> {
    return undefined;
  }
}
