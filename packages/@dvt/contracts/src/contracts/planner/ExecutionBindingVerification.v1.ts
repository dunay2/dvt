/**
 * Canonical execution binding verification and storage contracts (Stage 1.1, G-01.6 + G-01.8).
 *
 * ## Background
 *
 * `planId` identifies a logical plan core. `compiledCodeRef` is an optional
 * enrichment attached post-plan-build that associates a step with an immutable
 * compiled artifact (e.g. compiled SQL blob).
 *
 * Changing compiled artifact content while preserving the same `planId` is not
 * invisible — it is a new **execution binding**, even if it is not a new plan.
 * The engine MUST verify each binding at execution time and reject stale,
 * missing, or digest-mismatched bindings rather than silently executing against
 * drifted artifacts.
 *
 * Binding verification has no identity-allocation authority. It verifies the
 * `planId` / `stepId` supplied by the admitted plan and MUST NOT mint, repair, or
 * recover logical identity from artifact names, storage URIs, paths, ordinals,
 * aliases, provider coordinates, or compatibility heuristics. An unresolved
 * binding is a rejection, not an identity-discovery opportunity.
 *
 * ## Storage split
 *
 * - The state store persists the **canonical plan core** identified by `planId`.
 * - `PlanBindingRecord` persists artifact binding material **separately** from
 *   the hashed plan body.
 * - The engine reads the binding record at execution time to verify each
 *   binding.
 * - A different binding record may exist for the same `planId` without implying
 *   a new logical plan identity.
 *
 * @see docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json G-01.6, G-01.8
 * @see packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md §16
 */

// ── G-01.6 — Execution binding verification result ────────────────────────────

/**
 * Machine-readable rejection codes for a failed binding verification.
 *
 * - `MISSING_BINDING` — no binding record exists for the step.
 * - `STALE_BINDING` — the artifact at `storageUri` no longer matches the
 *   stored binding digest (artifact was replaced or deleted).
 * - `DIGEST_MISMATCH` — the resolved artifact digest does not match the digest
 *   recorded in the binding.
 */
export type BindingRejectionCode = 'MISSING_BINDING' | 'STALE_BINDING' | 'DIGEST_MISMATCH';

/**
 * Result of verifying one step's `compiledCodeRef` binding at execution time.
 *
 * The engine MUST call this verification for every step that carries a
 * `compiledCodeRef` before allowing execution to proceed. A single `ERROR`
 * result MUST cause the engine to reject execution for the entire plan run.
 */
export type ExecutionBindingVerificationResult =
  | {
      status: 'OK';
      stepId: string;
      /** Digest of the artifact confirmed to be present and unmodified. */
      bindingDigest: string;
    }
  | {
      status: 'ERROR';
      stepId: string;
      code: BindingRejectionCode;
      /** Digest read from the binding record, if available. */
      bindingDigest?: string;
      /** Human-readable explanation of why the binding was rejected. */
      reason: string;
    };

// ── G-01.8 — Plan binding storage record ─────────────────────────────────────

/**
 * One step's binding entry within a `PlanBindingRecord`.
 */
export interface StepBindingEntry {
  stepId: string;
  /**
   * Storage URI of the compiled artifact (from `CompiledCodeRef.storageUri`).
   * Stored to allow the engine to re-verify the binding at execution time.
   */
  storageUri: string;
  /**
   * SHA-256 digest of the artifact content at the time of binding.
   * The engine uses this to detect stale or tampered bindings.
   */
  bindingDigest: string;
}

/**
 * Binding record associated with a canonical plan.
 *
 * Persisted separately from the plan core body so that:
 * - the canonical `planId` hash is not affected by artifact content changes
 * - a new binding record can be created for the same `planId` without
 *   implying a new logical plan identity
 * - the engine can read and verify each binding at execution time
 *
 * A `PlanBindingRecord` with an empty `bindings` array is valid and means no
 * steps in this plan have compiled artifact enrichment.
 */
export interface PlanBindingRecord {
  planId: string;
  bindings: readonly StepBindingEntry[];
}
