/**
 * Generic planner preview-persist contract.
 *
 * Baseline ADRs:
 * - ADR-0005 contract formalization tooling
 * - ADR-0006 repository-authoritative contract governance
 * - ADR-0012 plan integrity ownership
 * - ADR-0018 shared-kernel ownership governance
 */
import type { PlanRef, RunContext } from '../../types/contracts.js';

import type { ExecutionPlan, GenericGraphSourceV1 } from './ExecutionPlan.v1.js';
import type { ExecutionSelection } from './ExecutionSelection.v1.js';
import type { ExecutabilityValidationResult } from './PlanExecutabilityValidation.v1.js';
import type { PlanPreviewProvenance } from './PlanPreviewProvenance.v1.js';

export const PREVIEW_PROFILE = {
  plannerGenericV1: 'planner-generic-v1',
} as const;

export type PreviewProfile = (typeof PREVIEW_PROFILE)[keyof typeof PREVIEW_PROFILE];

export const PLAN_PREVIEW_REJECTED_OUTCOME_CONTRACT_VERSION = '1.0.0' as const;

export const PLAN_PREVIEW_REJECTED_OUTCOME_KIND = {
  selectionRejected: 'selection-rejected',
  planInvalid: 'plan-invalid',
} as const;

export interface PlanPreviewRequest {
  previewProfile: PreviewProfile;
  context: RunContext;
  selection: ExecutionSelection;
  graphSource: GenericGraphSourceV1;
  planName?: string;
  provenance?: PlanPreviewProvenance;
  persist: true;
}

export interface PlanPreviewSummary {
  executor: 'postgres' | 'dbt';
  nodeCount: number;
  stepCount: number;
  sourceTables: readonly string[];
  sinkTables: readonly string[];
}

export interface PlanPreviewPersistedRecord {
  planRecordId: string;
  canonicalPlanSha256: string;
}

export interface PlanPreviewValidation {
  valid: true;
  warnings: readonly string[];
}

export interface PlanPreviewPersistResponse {
  previewProfile: PreviewProfile;
  plan: ExecutionPlan;
  planRef: PlanRef;
  planSummary?: PlanPreviewSummary;
  persisted: PlanPreviewPersistedRecord;
  validation: PlanPreviewValidation;
  provenance?: PlanPreviewProvenance;
}

export interface PlanPreviewSelectionRejection {
  readonly code: 'REJECTED';
  readonly cause?: string;
  readonly reason: string;
}

export interface PlanPreviewSelectionRejectedOutcome {
  readonly contractVersion: typeof PLAN_PREVIEW_REJECTED_OUTCOME_CONTRACT_VERSION;
  readonly kind: typeof PLAN_PREVIEW_REJECTED_OUTCOME_KIND.selectionRejected;
  readonly rejection: PlanPreviewSelectionRejection;
}

export interface PlanPreviewPlanInvalidOutcome extends Omit<
  PlanPreviewPersistResponse,
  'validation'
> {
  readonly contractVersion: typeof PLAN_PREVIEW_REJECTED_OUTCOME_CONTRACT_VERSION;
  readonly kind: typeof PLAN_PREVIEW_REJECTED_OUTCOME_KIND.planInvalid;
  readonly validation: Extract<ExecutabilityValidationResult, { readonly status: 'ERROR' }>;
}

export type PlanPreviewRejectedOutcome =
  PlanPreviewSelectionRejectedOutcome | PlanPreviewPlanInvalidOutcome;
