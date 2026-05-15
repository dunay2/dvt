/**
 * Owned concern: publish stored-plan artifact validation-state vocabulary.
 *
 * @baseline ADR-0043: PlanRecord, Plan Store, And Artifacts Ownership
 * @baseline ADR-0054: Plan Store Scoped Record Identity
 * @decision Publish stored-plan artifact validation as artifact state, not as a plan lifecycle facade.
 * @consequence Consumers depend on artifact validity vocabulary while behavior stays in artifact ports.
 * @version 1.0.0
 *
 * Behavior ports live in `@dvt/artifacts` as `IStoredPlanArtifactStore`.
 * This contract only publishes serializable validation-state records shared by
 * artifacts, adapters, API, and audit/read paths.
 */

import type { ExecutabilityValidationResult } from './PlanExecutabilityValidation.v1.js';

/**
 * Validation state of a tenant-neutral stored-plan artifact.
 *
 * Runtime materialization is permitted only when the state is `'VALID'`.
 */
export type StoredPlanArtifactValidationState = 'PENDING_VALIDATION' | 'VALID' | 'INVALID';

/**
 * Persisted validation record for a canonical stored-plan artifact.
 */
export interface StoredPlanArtifactValidationRecord {
  readonly planId: string;
  readonly state: StoredPlanArtifactValidationState;
  /** ISO 8601 timestamp when `storePlanArtifact` was called. */
  readonly storedAtIso: string;
  /** ISO 8601 timestamp of the last state transition. */
  readonly updatedAtIso: string;
  /**
   * Structured rejection report. Present only when `state === 'INVALID'`.
   * Stored for audit; never used to rebuild or retry the plan automatically.
   */
  readonly rejectionReport?: ExecutabilityValidationResult & { readonly status: 'ERROR' };
}
