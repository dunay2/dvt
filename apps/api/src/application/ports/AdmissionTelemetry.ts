import type { AdmissionMode } from './IAdmissionMode.js';

export type AdmissionTelemetryDecision =
  | 'accept'
  | 'duplicate'
  | 'reject_tenant'
  | 'reject_system'
  | 'would_reject_tenant'
  | 'would_reject_system';

export interface AdmissionTelemetry {
  recordDecision(input: {
    requestId: string;
    tenantId: string;
    runId: string;
    mode: AdmissionMode;
    decision: AdmissionTelemetryDecision;
    retryAfterSeconds?: number;
    duplicateOf?: 'run' | 'intent';
    code?:
      | 'TENANT_BACKPRESSURE'
      | 'SYSTEM_BACKPRESSURE'
      | 'BACKPRESSURE_SNAPSHOT_UNAVAILABLE'
      | 'OUTBOX_RATE_LIMIT_EXCEEDED';
  }): Promise<void>;
}
