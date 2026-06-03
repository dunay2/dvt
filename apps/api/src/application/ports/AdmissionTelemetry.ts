/**
 * Owned concern: define the admission telemetry record taxonomy for the
 * start-run application component.
 */
import {
  START_RUN_BACKPRESSURE_CODE,
  START_RUN_DUPLICATE_OF,
} from '@dvt/contracts';

import type { AdmissionMode } from './IAdmissionMode.js';

export const ADMISSION_TELEMETRY_DECISION = {
  accept: 'accept',
  duplicate: 'duplicate',
  rejectTenant: 'reject_tenant',
  rejectSystem: 'reject_system',
  wouldRejectTenant: 'would_reject_tenant',
  wouldRejectSystem: 'would_reject_system',
} as const;

type CommonFields = {
  readonly requestId: string;
  readonly tenantId: string;
  readonly runId: string;
  readonly mode: AdmissionMode;
};

export type AdmissionDecisionRecord =
  | (CommonFields & {
      readonly decision: typeof ADMISSION_TELEMETRY_DECISION.accept;
    })
  | (CommonFields & {
      readonly decision: typeof ADMISSION_TELEMETRY_DECISION.duplicate;
      readonly duplicateOf: (typeof START_RUN_DUPLICATE_OF)[keyof typeof START_RUN_DUPLICATE_OF];
    })
  | (CommonFields & {
      readonly decision:
        | typeof ADMISSION_TELEMETRY_DECISION.rejectTenant
        | typeof ADMISSION_TELEMETRY_DECISION.wouldRejectTenant;
      readonly code: typeof START_RUN_BACKPRESSURE_CODE.tenant;
      readonly retryAfterSeconds: number;
    })
  | (CommonFields & {
      readonly decision:
        | typeof ADMISSION_TELEMETRY_DECISION.rejectSystem
        | typeof ADMISSION_TELEMETRY_DECISION.wouldRejectSystem;
      readonly code:
        | typeof START_RUN_BACKPRESSURE_CODE.system
        | typeof START_RUN_BACKPRESSURE_CODE.snapshotUnavailable
        | typeof START_RUN_BACKPRESSURE_CODE.executionCapacityExhausted
        | typeof START_RUN_BACKPRESSURE_CODE.executorUnavailable
        | typeof START_RUN_BACKPRESSURE_CODE.capacitySignalUnavailable;
      readonly retryAfterSeconds: number;
    });

export type AdmissionTelemetryDecision = AdmissionDecisionRecord['decision'];

export interface AdmissionTelemetry {
  record(event: AdmissionDecisionRecord): Promise<void>;
}
