/**
 * S08 canonical persisted plan artifact record.
 *
 * Baseline ADRs:
 * - ADR-0041 explicit state models
 * - ADR-0042 canonical plan identity
 * - ADR-0043 plan record ownership
 */
import type { ExecutionPlan } from './ExecutionPlan.v1.js';

export type PlanRecordState = 'ACTIVE' | 'SUPERSEDED' | 'ARCHIVED';
type HexSha256 = ExecutionPlan['metadata']['planId'];

export interface PlanStoreScope {
  tenantId: string;
  projectId: string;
  environmentId: string;
}

interface PlanRecordBase extends PlanStoreScope {
  planId: HexSha256;
  /**
   * Persisted canonical planner-emitted `ExecutionPlan` JSON.
   *
   * The top-level identity fields on this record are repeated for queryability,
   * but they must match the embedded canonical plan metadata exactly.
   */
  canonicalPlanJson: string;
  canonicalHash: HexSha256;
  planVersion: ExecutionPlan['metadata']['planVersion'];
  schemaVersion: ExecutionPlan['metadata']['schemaVersion'];
  contractVersion: ExecutionPlan['metadata']['contractVersion'];
  sourceRef: string;
  createdAtIso: string;
  updatedAtIso: string;
  derivedFromPlanId?: HexSha256 | undefined;
  supersedesPlanId?: HexSha256 | undefined;
}

export type PlanRecord =
  | (PlanRecordBase & {
      state: 'ACTIVE';
    })
  | (PlanRecordBase & {
      state: 'SUPERSEDED';
    })
  | (PlanRecordBase & {
      state: 'ARCHIVED';
      archivedAtIso: string;
    });
