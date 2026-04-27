/**
 * Canonical plan validation lifecycle contract (Stage 1.1, G-01.9).
 *
 * ## Problem
 *
 * The two-phase validity model (planner validity → engine executability) creates
 * a TOCTOU risk: if a plan is validated in memory and then rebuilt or mutated
 * before execution starts, the validation guarantee is void.
 *
 * ## Rule
 *
 * The canonical plan MUST be persisted in a **non-runnable** state before
 * executability validation begins. Validation operates on the persisted
 * reference. The lifecycle transition to `VALID` gates execution. A plan that
 * has not successfully completed this lifecycle may not start.
 *
 * ## Lifecycle states
 *
 * ```
 * storePlan()       markValid()
 * ──────────►  PV  ──────────►  VALID  ──► startRun()
 *                  └──────────►  INVALID  (permanent, not retried)
 *                    markInvalid()
 * ```
 *
 * - `PENDING_VALIDATION` (PV) — plan is persisted but not yet validated.
 *   The engine has not confirmed it is executable on the target adapter.
 *   `startRun` MUST be rejected for plans in this state.
 *
 * - `VALID` — executability validation succeeded. The plan is eligible for
 *   `startRun`. The plan core and validation decision are immutable from
 *   this point.
 *
 * - `INVALID` — executability validation failed with a structured rejection
 *   report. The plan is permanently non-runnable. The rejection report is
 *   stored for audit.
 *
 * ## Availability rule
 *
 * Once this contract is operational:
 * - engine unavailability at admission time MUST fail closed for flows that
 *   claim executability-checked start semantics
 * - a fast-path that bypasses validation (e.g. dev mode) MUST NOT be presented
 *   as equivalent to a validated start path
 *
 * @see docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json G-01.9
 * @see packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md §17
 */

import type { ExecutabilityValidationResult } from './PlanExecutabilityValidation.v1.js';

// ── State type ─────────────────────────────────────────────────────────────────

/**
 * Lifecycle state of a persisted canonical plan.
 *
 * `startRun` is permitted only when the state is `'VALID'`.
 */
export type PlanValidationState = 'PENDING_VALIDATION' | 'VALID' | 'INVALID';

// ── Record type ────────────────────────────────────────────────────────────────

/**
 * Persisted validation record for a canonical plan.
 */
export interface PlanValidationRecord {
  planId: string;
  state: PlanValidationState;
  /** ISO 8601 timestamp when `storePlan` was called. */
  storedAtIso: string;
  /** ISO 8601 timestamp of the last state transition. */
  updatedAtIso: string;
  /**
   * Structured rejection report. Present only when `state === 'INVALID'`.
   * Stored for audit; never used to rebuild or retry the plan automatically.
   */
  rejectionReport?: ExecutabilityValidationResult & { status: 'ERROR' };
}
