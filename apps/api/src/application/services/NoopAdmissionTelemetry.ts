import type { AdmissionTelemetry } from '../ports/AdmissionTelemetry.js';

export class NoopAdmissionTelemetry implements AdmissionTelemetry {
  public async recordDecision(
    _input: Parameters<AdmissionTelemetry['recordDecision']>[0]
  ): Promise<void> {
    return undefined;
  }
}
