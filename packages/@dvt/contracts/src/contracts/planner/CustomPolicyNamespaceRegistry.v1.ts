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
 * ## Reactivation rule (Decision 8, section 20)
 *
 * The following constraints describe the only acceptable shape for a future
 * reactivation. They are compatibility guidance, not active planner
 * responsibilities in AR-A4.
 *
 * `custom` passthrough may become active only if bounded by:
 * - namespace ownership — every accepted namespace must have a named owner
 * - schema / zod validation — payloads must be validated against a registered schema
 * - size limits — serialized payload may not exceed `maxPayloadBytes`
 * - secret-field denial — statically forbidden field names are rejected at
 *   plan-build time regardless of value
 * - clear separation from normative fields — `custom` content MUST NOT influence
 *   canonical retry, timeout, or concurrency resolution
 *
 * ## Reactivation-only validation split
 *
 * AR-A4 does not approve active namespace validation. If a later governed
 * slice reactivates the seam, planner responsibilities would be:
 * - call the planner-owned custom policy namespace registry for each key in
 *   the `custom` map;
 * - reject any unregistered namespace with `UNREGISTERED_NAMESPACE`;
 * - enforce `maxPayloadBytes`, `deniedFieldNames`, and the registered schema;
 * - avoid enforcing authorization or capability gates, which remain runtime
 *   concerns.
 *
 * If reactivated, engine/runtime responsibilities would be:
 * - apply additional authorization gates, such as tenant-safe rules or feature
 *   flags, before allowing a `custom` payload to influence execution behavior;
 * - treat a registered and schema-valid namespace as insufficient for
 *   engine-level authorization;
 * - reject `custom` payloads that reference unsupported or unauthorized
 *   capabilities before the run starts.
 *
 * ## Authority boundary
 *
 * Serializable namespace vocabulary lives in `@dvt/contracts` for source
 * compatibility. The behavior port for registry lookup is planner-owned and
 * frozen. Unknown namespaces are not silently promoted to canonical behavior,
 * and this contract does not approve an active registry implementation.
 *
 * @see docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json G-01.3
 * @see packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md §20
 */

// ── Rejection codes ───────────────────────────────────────────────────────────

/**
 * Machine-readable rejection codes reserved for a future reactivated custom
 * namespace validation flow.
 *
 * These codes remain exported as compatibility vocabulary. They do not imply
 * that the planner currently performs namespace validation.
 *
 * - `UNREGISTERED_NAMESPACE` — no registration entry exists for this namespace.
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
 * Structured error shape reserved for a future reactivated flow where a custom
 * policy payload fails registration checks at plan-build time.
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
 * Compatibility registration entry shape for one `custom` policy namespace.
 *
 * AR-A4 preserves this DTO vocabulary but does not approve a planner-owned
 * registry implementation. A future namespace owner may use this shape only
 * after real-consumer and ADR-backed reactivation.
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
   * In a reactivated flow, the planner would serialize the payload with
   * `JSON.stringify` and reject it with `PAYLOAD_TOO_LARGE` if the byte length
   * exceeds this value.
   */
  maxPayloadBytes: number;

  /**
   * Field names that are statically denied in this namespace's payload.
   *
   * In a reactivated flow, any payload key whose name appears in this list
   * would cause a hard `DENIED_FIELD` rejection at plan-build time, regardless
   * of the field's value. Owners would include common secret-bearing names
   * relevant to their namespace (e.g. `'password'`, `'apiKey'`, `'token'`,
   * `'secret'`).
   */
  deniedFieldNames: readonly string[];

  /**
   * Schema validator for the namespace's payload shape.
   *
   * In a reactivated flow, the planner would call `schema.safeParse(payload)`
   * after size and denied-field checks pass. A `success: false` result would
   * cause a `SCHEMA_VIOLATION` rejection.
   */
  schema: CustomPolicySchemaValidator;
}

// ── Custom policy map ─────────────────────────────────────────────────────────

/**
 * The shape of the `custom` field in `PlannerPolicyClassSet`.
 *
 * Each key is a namespace identifier; each value is an opaque compatibility
 * payload. AR-A4 does not approve active validation against registered schemas.
 *
 * An empty map (`{}`) is valid and means no custom policies are active.
 */
export type CustomPolicyMap = Readonly<Record<string, unknown>>;
