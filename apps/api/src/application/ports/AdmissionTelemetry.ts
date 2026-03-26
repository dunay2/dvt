import type { AdmissionMode } from './IAdmissionMode.js';
import type {
  START_RUN_BACKPRESSURE_CODE,
  START_RUN_DUPLICATE_OF,
  START_RUN_RATE_LIMIT_CODE,
} from './startRunResultContract.js';

export const ADMISSION_TELEMETRY_DECISION = {
  accept: 'accept',
  duplicate: 'duplicate',
  rejectTenant: 'reject_tenant',
  rejectSystem: 'reject_system',
  wouldRejectTenant: 'would_reject_tenant',
  wouldRejectSystem: 'would_reject_system',
} as const;

export type AdmissionTelemetryDecision =
  (typeof ADMISSION_TELEMETRY_DECISION)[keyof typeof ADMISSION_TELEMETRY_DECISION];

type AdmissionTelemetryCode =
  | (typeof START_RUN_BACKPRESSURE_CODE)[keyof typeof START_RUN_BACKPRESSURE_CODE]
  | (typeof START_RUN_RATE_LIMIT_CODE)[keyof typeof START_RUN_RATE_LIMIT_CODE];

export interface AdmissionTelemetry {
  recordDecision(input: {
    requestId: string;
    tenantId: string;
    runId: string;
    mode: AdmissionMode;
    decision: AdmissionTelemetryDecision;
    retryAfterSeconds?: number;
    duplicateOf?: (typeof START_RUN_DUPLICATE_OF)[keyof typeof START_RUN_DUPLICATE_OF];
    code?: AdmissionTelemetryCode;
  }): Promise<void>;
}
