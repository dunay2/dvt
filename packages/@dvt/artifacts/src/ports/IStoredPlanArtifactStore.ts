/**
 * Owned concern: expose stored-plan artifact lifecycle and materialization ports.
 *
 * Stored-plan artifacts are tenant-neutral bytes, but every runtime materialization
 * must start from a scoped plan record reference.
 */
import type {
  ExecutabilityValidationResult,
  PlanRefSchemaT,
  PlanValidationRecord,
  PlannerBuildResultV1,
  RunExecutionPolicy,
  ScopedPlanId,
  ScopedPlanRef,
} from '@dvt/contracts';
export interface StoredPlanArtifact {
  readonly bytes: Uint8Array;
  readonly executionPolicy: RunExecutionPolicy;
}

export type StorePlanArtifactInput = {
  readonly buildResult: PlannerBuildResultV1;
};

export type MarkStoredPlanArtifactInvalidInput = ScopedPlanRef & {
  readonly report: ExecutabilityValidationResult & { readonly status: 'ERROR' };
};

export interface IStoredPlanArtifactWriter {
  storePlanArtifact(input: StorePlanArtifactInput): Promise<PlanRefSchemaT>;
  markStoredPlanArtifactValid(input: ScopedPlanRef): Promise<void>;
  markStoredPlanArtifactInvalid(input: MarkStoredPlanArtifactInvalidInput): Promise<void>;
}

export interface IStoredPlanArtifactReader {
  getStoredPlanValidationRecord(input: ScopedPlanId): Promise<PlanValidationRecord | undefined>;
  fetchStoredPlanArtifact(input: ScopedPlanRef): Promise<StoredPlanArtifact>;
  fetchStoredPlanArtifactForValidation(input: ScopedPlanRef): Promise<StoredPlanArtifact>;
}

export type IStoredPlanArtifactStore = IStoredPlanArtifactWriter & IStoredPlanArtifactReader;
