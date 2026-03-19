import type { AdmissionTelemetry } from '../ports/AdmissionTelemetry.js';

export class NoopAdmissionTelemetry implements AdmissionTelemetry {
  public async recordDecision(): Promise<void> {
    return undefined;
  }
}
