/**
 * Canonical plan executability validation contract (Stage 1.1, G-01.1).
 *
 * The executability gate is a two-phase validity model:
 *
 * 1. **Planner validity** — the plan is structurally valid, deterministic,
 *    and contract-compliant. Guaranteed by the planner at `buildPlan` time.
 * 2. **Engine executability validity** — the engine validates the plan
 *    against the target adapter's runtime capabilities before execution starts.
 *    Governed by this contract.
 *
 * The gate is owned by the engine/adapter layer, not by the planner.
 * The planner neither calls this interface nor retries on rejection.
 * Adaptive replanning, if it ever exists, belongs to an explicit
 * higher-layer orchestration contract that is out of scope for Stage 1.1.
 *
 * ### Caller responsibility (admission / orchestration layer)
 *
 * Before calling `validatePlan` the admission layer MUST:
 * 1. Persist the plan in a non-runnable state (e.g. `PENDING_VALIDATION`).
 * 2. Obtain the `PlanRef` from the state store.
 * 3. Call `validatePlan(planRef, adapterId)`.
 * 4. On `OK` — transition the persisted plan to `VALID`, then start execution.
 * 5. On `ERROR` — transition the persisted plan to `INVALID` with the report.
 *
 * A "validate in memory, then rebuild before start" flow is **out of contract**.
 *
 * @see docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json G-01.1
 * @see packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md §17
 */

import type { PlanRefSchemaT } from '../../schemas.js';

// ── Error codes ────────────────────────────────────────────────────────────────

/**
 * Machine-readable rejection codes for a non-executable plan.
 *
 * - `MISSING_CAPABILITY` — the target adapter does not support a required capability.
 * - `POLICY_UNSUPPORTED` — a canonical policy class cannot be honored by the adapter.
 * - `INVALID_STEP_KIND` — a step kind in the plan is not registered or executable.
 * - `REJECTED` — catch-all for adapter-specific hard rejections not covered above.
 */
export type ExecutabilityRejectionCode =
  | 'MISSING_CAPABILITY'
  | 'POLICY_UNSUPPORTED'
  | 'INVALID_STEP_KIND'
  | 'UNSUPPORTED_PLAN_VERSION'
  | 'REJECTED';

// ── Result type ────────────────────────────────────────────────────────────────

/**
 * Structured result returned by `IPlanExecutabilityValidator.validatePlan`.
 *
 * The discriminant is `status`:
 * - `'OK'` — the plan can be executed on the target adapter.
 * - `'ERROR'` — the plan cannot be executed; `code` identifies the rejection class.
 *
 * `degradable` signals whether the adapter can proceed in a degraded mode
 * (e.g. disable an optional feature) rather than hard-failing execution.
 * A degradable rejection does **not** imply the plan will be accepted as-is;
 * it is advisory for the orchestration layer.
 */
export type ExecutabilityValidationResult =
  | {
      status: 'OK';
      planId: string;
      adapterId: string;
    }
  | {
      status: 'ERROR';
      planId: string;
      adapterId: string;
      code: ExecutabilityRejectionCode;
      /** Whether graceful degradation is possible rather than a hard failure. */
      degradable: boolean;
      /** Human-readable explanation of the rejection. */
      reason: string;
      /**
       * Specific capability name, policy kind, or step kind that caused the
       * rejection. Allows the orchestration layer to log structured diagnostics.
       */
      cause?: string;
    };

// ── Port interface ─────────────────────────────────────────────────────────────

/**
 * Port for validating a persisted plan against the capabilities of a target
 * adapter/runtime before execution is allowed to start.
 *
 * Implementations live in adapter packages (e.g. `@dvt/adapter-temporal`).
 * The canonical owner of this contract is `@dvt/contracts`.
 */
export interface IPlanExecutabilityValidator {
  /**
   * Validates a persisted plan against the target adapter's runtime capabilities.
   *
   * @param planRef - Immutable reference to the persisted canonical plan.
   *   The plan MUST already exist in the state store in a non-runnable state
   *   before this method is called.
   * @param adapterId - Target adapter identifier (e.g. `'temporal'`, `'conductor'`).
   * @returns A structured validation result.
   */
  validatePlan(planRef: PlanRefSchemaT, adapterId: string): Promise<ExecutabilityValidationResult>;
}
