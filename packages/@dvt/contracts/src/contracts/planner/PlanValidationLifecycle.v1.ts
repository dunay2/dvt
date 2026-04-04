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

import type { PlanRefSchemaT } from '../../schemas.js';

import type { ExecutionPlan, PlannerBuildResultV1 } from './ExecutionPlan.v1.js';
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

// ── Port interface ─────────────────────────────────────────────────────────────

/**
 * Port for managing the plan validation lifecycle.
 *
 * Owned by the admission / orchestration layer. Implementations live in
 * state-store or API-boundary packages.
 *
 * ### Typical caller sequence
 *
 * ```
 * const planRef = await store.storePlan(buildResult);
 * const result  = await validator.validatePlan(planRef, adapterId);
 * if (result.status === 'OK') {
 *   await store.markValid(planRef);
 *   await engine.startRun(planRef, ctx);
 * } else {
 *   await store.markInvalid(planRef, result);
 * }
 * ```
 */
export interface IPlanValidationLifecycleStore {
  /**
   * Persist the canonical plan in `PENDING_VALIDATION` state.
   *
   * The plan core MUST be stored unmodified (the enriched/bound form must
   * not replace the hashed core in the canonical store). Returns an immutable
   * `PlanRef` used for all subsequent validation and start operations.
   *
   * @param buildResult - The output of `IPlanner.buildPlan`, containing the
   *   canonical plan and its JSON representation.
   * @returns An immutable reference to the stored plan.
   */
  storePlan(buildResult: PlannerBuildResultV1): Promise<PlanRefSchemaT>;

  /**
   * Transition a `PENDING_VALIDATION` plan to `VALID`.
   *
   * After this call the plan is eligible for `startRun`. Calling this method
   * on a plan that is not in `PENDING_VALIDATION` state MUST throw.
   */
  markValid(planRef: PlanRefSchemaT): Promise<void>;

  /**
   * Transition a `PENDING_VALIDATION` plan to `INVALID`.
   *
   * The rejection report is stored for audit. The plan is permanently
   * non-runnable. Calling this method on a plan that is not in
   * `PENDING_VALIDATION` state MUST throw.
   *
   * @param report - The `ERROR` result from `IPlanExecutabilityValidator.validatePlan`.
   */
  markInvalid(
    planRef: PlanRefSchemaT,
    report: ExecutabilityValidationResult & { status: 'ERROR' }
  ): Promise<void>;

  /**
   * Retrieve the current validation record for a plan.
   *
   * Returns `undefined` if no record exists for the given `planId`.
   */
  getValidationRecord(planId: string): Promise<PlanValidationRecord | undefined>;
}

// Re-export ExecutionPlan locally so callers of this file have access to it
// without a separate import when working with storePlan signatures.
export type { ExecutionPlan, PlannerBuildResultV1 };
