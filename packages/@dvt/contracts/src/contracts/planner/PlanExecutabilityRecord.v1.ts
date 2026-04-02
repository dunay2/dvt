/**
 * S08 adapter-scoped plan executability record.
 *
 * Baseline ADRs:
 * - ADR-0041 explicit state models
 * - ADR-0043 three-part plan-store model
 */
import type { ExecutionPlan } from './ExecutionPlan.v2.js';
import type { ExecutabilityRejectionCode } from './PlanExecutabilityValidation.v1.js';

export type PlanExecutabilityState = 'PENDING' | 'VALID' | 'INVALID';

export interface PlanExecutabilityRejectionReport {
  code: ExecutabilityRejectionCode;
  reason: string;
  degradable: boolean;
  cause?: string | undefined;
}

interface PlanExecutabilityRecordBase {
  planId: ExecutionPlan['metadata']['planId'];
  adapterId: string;
}

export type PlanExecutabilityRecord =
  | (PlanExecutabilityRecordBase & {
      state: 'PENDING';
    })
  | (PlanExecutabilityRecordBase & {
      state: 'VALID';
      validatedAtIso: string;
    })
  | (PlanExecutabilityRecordBase & {
      state: 'INVALID';
      validatedAtIso: string;
      rejectionReport: PlanExecutabilityRejectionReport;
    });
