/**
 * Owned concern: publish stored-plan artifact validation record vocabulary.
 *
 * The behavior port lives in `@dvt/artifacts` as `IStoredPlanArtifactStore`.
 * This contract file only publishes serializable validation-state vocabulary
 * shared by artifacts, adapters, API, and audit/read paths.
 */

import type { ExecutabilityValidationResult } from './PlanExecutabilityValidation.v1.js';

/**
 * Lifecycle state of a persisted canonical plan artifact.
 *
 * `startRun` is permitted only when the state is `'VALID'`.
 */
export type PlanValidationState = 'PENDING_VALIDATION' | 'VALID' | 'INVALID';

/**
 * Persisted validation record for a canonical stored-plan artifact.
 */
export interface PlanValidationRecord {
  readonly planId: string;
  readonly state: PlanValidationState;
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
