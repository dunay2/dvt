/**
 * SQL-first transformation preview-persist contract (TF-A1-A).
 *
 * Baseline ADRs:
 * - ADR-0005 contract formalization tooling
 * - ADR-0006 repository-authoritative contract governance
 * - ADR-0012 plan integrity ownership
 * - ADR-0018 shared-kernel ownership governance
 */
import type { PlanRef, RunContext } from '../../types/contracts.js';

import type { ExecutionPlan, GenericGraphSourceV1 } from './ExecutionPlan.v1.js';
import {
  TRANSFORMATION_SQL_FIRST_SOURCE_VERSION,
  type PlanPreviewProvenance,
  type TransformationSqlFirstGraphSourceV1,
} from './TransformationFlowDesignGraph.v1.js';

export const PREVIEW_PROFILE = {
  plannerGenericV1: 'planner-generic-v1',
  transformationSqlFirstV1: TRANSFORMATION_SQL_FIRST_SOURCE_VERSION,
} as const;

export type PreviewProfile = (typeof PREVIEW_PROFILE)[keyof typeof PREVIEW_PROFILE];

export interface PlanPreviewRequest {
  previewProfile: PreviewProfile;
  context: RunContext;
  selectedNodeIds: readonly string[];
  graphSource: GenericGraphSourceV1;
  planName?: string;
  provenance?: PlanPreviewProvenance;
  persist: true;
}

export interface TransformationSqlFirstPlanPreviewRequest extends PlanPreviewRequest {
  previewProfile: typeof PREVIEW_PROFILE.transformationSqlFirstV1;
  graphSource: TransformationSqlFirstGraphSourceV1;
  provenance: PlanPreviewProvenance;
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

export interface TransformationSqlFirstPlanPreviewPersistResponse extends PlanPreviewPersistResponse {
  previewProfile: typeof PREVIEW_PROFILE.transformationSqlFirstV1;
  planSummary: PlanPreviewSummary & {
    executor: 'postgres';
  };
  provenance: PlanPreviewProvenance;
}
