/**
 * Bounded `custom` namespace registration contract (Stage 1.1, G-01.3).
 *
 * Owned concern: retain source-compatible custom policy namespace DTO
 * vocabulary while the planner behavior seam is frozen.
 *
 * Frozen compatibility seam: AR-A4 keeps this serializable vocabulary available
 * for compatibility, but no registry implementation or active namespace
 * validation behavior is approved until a real consumer and ADR-backed
 * reactivation exist.
 *
 * ## Problem
 *
 * The `custom` passthrough field in `PlannerPolicyClassSet` is a deliberate
 * extension seam. Without a governed registration model it becomes an opaque
 * escape hatch: namespaces are not validated, secret-bearing fields are not
 * denied, and the boundary between planner-time and runtime enforcement is
 * undefined.
 *
 * ## Rule (Decision 8, §20)
 *
 * `custom` passthrough is allowed only if bounded by:
 * - namespace ownership — every accepted namespace must have a named owner
 * - schema / zod validation — payloads must be validated against a registered schema
 * - size limits — serialized payload may not exceed `maxPayloadBytes`
 * - secret-field denial — statically forbidden field names are rejected at
 *   plan-build time regardless of value
 * - clear separation from normative fields — `custom` content MUST NOT influence
 *   canonical retry, timeout, or concurrency resolution
 *
 * ## Validation split (planner and runtime responsibility)
 *
 * **Planner (plan-build time)**:
 * - Calls the planner-owned custom policy namespace registry for each key in
 *   the `custom` map.
 * - Rejects any unregistered namespace with `UNREGISTERED_NAMESPACE`.
 * - Enforces `maxPayloadBytes`, `deniedFieldNames`, and the registered schema.
 * - Does **not** enforce authorization or capability gates — those are runtime
 *   concerns.
 *
 * **Engine / runtime (execution time)**:
 * - May apply additional authorization gates (e.g. tenant-safe rules, feature
 *   flags) before allowing a `custom` payload to influence execution behavior.
 * - A registered and schema-valid namespace does **not** imply engine-level
 *   authorization.
 * - Engine MUST reject `custom` payloads that reference unsupported or
 *   unauthorized capabilities before the run starts.
 *
 * ## Authority boundary
 *
 * Serializable namespace vocabulary lives in `@dvt/contracts`. The behavior
 * port for registry lookup is planner-owned. Unknown namespaces are not
 * silently promoted to canonical behavior.
 *
 * @see docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json G-01.3
 * @see packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md §20
 */

// ── Rejection codes ───────────────────────────────────────────────────────────

/**
 * Machine-readable rejection codes for a failed custom namespace validation.
 *
 * - `UNREGISTERED_NAMESPACE` — no registration entry exists for this namespace.
 *   The planner MUST hard-reject the plan.
 * - `PAYLOAD_TOO_LARGE` — serialized payload exceeds `maxPayloadBytes`.
 * - `DENIED_FIELD` — payload contains a statically forbidden field name.
 * - `SCHEMA_VIOLATION` — payload fails the registered schema validator.
 */
export type CustomPolicyRejectionCode =
  | 'UNREGISTERED_NAMESPACE'
  | 'PAYLOAD_TOO_LARGE'
  | 'DENIED_FIELD'
  | 'SCHEMA_VIOLATION';

// ── Validation error type ─────────────────────────────────────────────────────

/**
 * Structured error emitted when a custom policy payload fails registration
 * checks at plan-build time.
 */
export interface CustomPolicyValidationError {
  namespace: string;
  code: CustomPolicyRejectionCode;
  /** Human-readable explanation. */
  reason: string;
  /**
   * Field name that triggered the rejection.
   * Present only for `DENIED_FIELD` rejections.
   */
  deniedField?: string;
}

// ── Namespace entry ───────────────────────────────────────────────────────────

/**
 * Minimal schema validator interface accepted by `CustomPolicyNamespaceEntry`.
 *
 * Deliberately narrow: only `safeParse` is required so that Zod schemas
 * (and any other validator with a compatible surface) can be used without
 * a hard Zod dependency in this contract package.
 */
export interface CustomPolicySchemaValidator {
  safeParse(data: unknown): { success: boolean; error?: unknown };
}

/**
 * Registration entry for one `custom` policy namespace.
 *
 * Created by the namespace owner and registered with a planner-owned registry
 * implementation.
 */
export interface CustomPolicyNamespaceEntry {
  /**
   * Unique namespace identifier.
   *
   * Convention: `<owner-prefix>.<domain>` (e.g. `'dvt.observability'`,
   * `'acme.audit'`). The identifier is case-sensitive.
   */
  namespace: string;

  /**
   * Human-readable description of the namespace's purpose and owner.
   * Used in error messages and diagnostic output.
   */
  description: string;

  /**
   * Maximum serialized payload size in bytes.
   *
   * The planner MUST serialize the payload with `JSON.stringify` and reject
   * it with `PAYLOAD_TOO_LARGE` if the byte length exceeds this value.
   */
  maxPayloadBytes: number;

  /**
   * Field names that are statically denied in this namespace's payload.
   *
   * Any payload key whose name appears in this list causes a hard
   * `DENIED_FIELD` rejection at plan-build time, regardless of the field's
   * value. Owners MUST include common secret-bearing names relevant to their
   * namespace (e.g. `'password'`, `'apiKey'`, `'token'`, `'secret'`).
   */
  deniedFieldNames: readonly string[];

  /**
   * Schema validator for the namespace's payload shape.
   *
   * The planner calls `schema.safeParse(payload)` after size and
   * denied-field checks pass. A `success: false` result causes a
   * `SCHEMA_VIOLATION` rejection.
   */
  schema: CustomPolicySchemaValidator;
}

// ── Custom policy map ─────────────────────────────────────────────────────────

/**
 * The shape of the `custom` field in `PlannerPolicyClassSet`.
 *
 * Each key is a namespace identifier; each value is an opaque payload
 * validated against the registered schema for that namespace.
 *
 * An empty map (`{}`) is valid and means no custom policies are active.
 */
export type CustomPolicyMap = Readonly<Record<string, unknown>>;
