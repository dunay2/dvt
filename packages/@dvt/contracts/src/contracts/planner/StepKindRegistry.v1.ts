/**
 * Canonical step-kind registry contracts (Stage 1.1, G-01.11).
 *
 * ## Problem
 *
 * `StepKind = string` is maximally open; arbitrary string values pass the type checker.
 * Without a governed allowlist, unknown step kinds can reach the engine
 * silently. There is no compile-time inventory of what the system considers
 * canonical, and no governed staging area for provisional kinds pending
 * promotion or rejection.
 *
 * ## Target-state policy (§19, Option B)
 *
 * The target state for a multi-tenant governed system is **fail-closed by
 * default** for unknown `StepKind`:
 *
 * - A step whose kind is absent from `KnownStepKind` AND absent from
 *   `STEP_KIND_BRIDGE_REGISTRY` MUST be rejected before execution.
 * - Adding a fully canonical kind requires a `@dvt/contracts` change — not a
 *   runtime-only allowlist update.
 * - Explicit capability declaration, schema validation, authorization checks,
 *   size limits, namespace discipline, and observability are required for any
 *   extension path.
 *
 * ## Interim operating rule (bridge period)
 *
 * Until the target state is fully enforced, a provisional kind may pass only
 * when all of the following are true:
 *
 * 1. The kind appears in `STEP_KIND_BRIDGE_REGISTRY` (this file).
 * 2. The execution path emits a warning-grade diagnostic.
 * 3. The kind is treated as non-canonical and subject to later rejection.
 *
 * `STEP_KIND_BRIDGE_REGISTRY` is a **compile-time governed inventory** — not
 * a runtime escape hatch. Adapters MUST NOT maintain separate local allowlists.
 *
 * ## Allowlist authority
 *
 * - The canonical source of truth for known kinds is `KnownStepKind`.
 * - The canonical source of truth for provisional kinds is `STEP_KIND_BRIDGE_REGISTRY`.
 * - Both live in `@dvt/contracts`. Neither may be forked into adapter packages.
 *
 * @see docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json G-01.11
 * @see packages/@dvt/planner/docs/planning/Stage-1.1-Planner-Canonicalization.md §19
 */

// ── Known step kinds ──────────────────────────────────────────────────────────

/**
 * Canonical step kind constants.
 *
 * This object is the normative single source for all fully promoted step kinds.
 * Adding a new entry here is a contracts change and requires a corresponding
 * schema registration in `StepTypeRegistry`.
 */
export const KNOWN_STEP_KINDS = {
  DBT_MODEL: 'DBT_MODEL',
  DBT_TEST: 'DBT_TEST',
  DBT_SNAPSHOT: 'DBT_SNAPSHOT',
  LOAD_OBJECT_FILE_TO_POSTGRES: 'LOAD_OBJECT_FILE_TO_POSTGRES',
  ACQUIRE_HTTP_JSON_ARTIFACT: 'ACQUIRE_HTTP_JSON_ARTIFACT',
} as const;

const KNOWN_STEP_KIND_VALUES = new Set<string>(Object.values(KNOWN_STEP_KINDS));

/**
 * Union type of all canonical step kinds.
 *
 * A step whose `kind` is assignable to `KnownStepKind` is fully governed:
 * it has a registered schema, canonical adapter support, and no bridge-period
 * caveats. Steps with a `StepKind` that is NOT a `KnownStepKind` require a
 * bridge registry entry to proceed.
 */
export type KnownStepKind = (typeof KNOWN_STEP_KINDS)[keyof typeof KNOWN_STEP_KINDS];

/**
 * Returns `true` if `kind` is a fully canonical `KnownStepKind`.
 *
 * A `true` result means the kind has a registered schema and is governed by
 * contract. A `false` result does NOT mean the kind is allowed — callers
 * must also check `isBridgeRegisteredStepKind` and emit diagnostics if the
 * kind is only bridge-registered.
 */
export function isKnownStepKind(kind: string): kind is KnownStepKind {
  return KNOWN_STEP_KIND_VALUES.has(kind);
}

// ── Bridge registry ───────────────────────────────────────────────────────────

/**
 * One entry in the provisional step-kind bridge registry.
 *
 * Each entry MUST carry explicit owner and decision-date metadata. A bridge
 * entry is NOT a permanent acceptance — it is a staged provisional landing
 * zone pending promotion to `KnownStepKind` or explicit rejection.
 */
export interface StepKindBridgeEntry {
  /**
   * The provisional step kind string.
   *
   * Convention matches `KnownStepKind` — SCREAMING_SNAKE_CASE. The kind MUST
   * NOT already appear in `KNOWN_STEP_KINDS`.
   */
  kind: string;

  /**
   * Team or individual responsible for this provisional kind.
   *
   * The owner MUST drive the kind toward promotion or explicit rejection.
   * Ownerless entries are not accepted.
   */
  owner: string;

  /**
   * ISO 8601 date when this provisional kind was registered.
   *
   * Used for staleness checks. A bridge entry with no recorded decision date
   * is a governance defect.
   */
  decisionDate: string;

  /**
   * Human-readable explanation of why this kind is provisional rather than
   * immediately canonical.
   *
   * Should include: what schema is planned, what delivery gate promotes it,
   * and why it is not rejected outright.
   */
  reason: string;

  /**
   * ISO 8601 date by which a promotion or rejection decision is expected.
   *
   * Optional but strongly recommended. An overdue bridge entry without a
   * decision date is treated as a governance warning.
   */
  targetDecisionDate?: string;
}

/**
 * The canonical compile-time bridge registry for provisional step kinds.
 *
 * ### Governance rules
 *
 * - Every entry MUST have `owner`, `decisionDate`, and `reason`.
 * - Adapters MUST consume this array; they MUST NOT maintain local copies.
 * - An empty registry means no provisional kinds are currently sanctioned.
 * - Entries are removed when the kind is promoted to `KnownStepKind` or
 *   formally rejected.
 *
 * ### Diagnostic requirement
 *
 * Any execution path that dispatches a bridge-registered kind MUST emit a
 * warning-grade diagnostic identifying the kind and the provisional status.
 */
function defineStepKindBridgeRegistry(
  entries: readonly StepKindBridgeEntry[]
): readonly StepKindBridgeEntry[] {
  return Object.freeze([...entries]);
}

export const STEP_KIND_BRIDGE_REGISTRY: readonly StepKindBridgeEntry[] =
  defineStepKindBridgeRegistry([
    // No provisional kinds registered at Stage 1.1 canonicalization time.
    // Add entries here when a new kind is staged for promotion.
  ]);

/**
 * Returns `true` if `kind` appears in the bridge registry.
 *
 * A bridge-registered kind may proceed in the interim period, but MUST NOT
 * be treated as canonical. The caller MUST emit a warning-grade diagnostic.
 */
export function isBridgeRegisteredStepKind(kind: string): boolean {
  for (const entry of STEP_KIND_BRIDGE_REGISTRY) {
    if (entry.kind === kind) {
      return true;
    }
  }

  return false;
}

/**
 * Returns the bridge entry for `kind`, or `undefined` if the kind is not
 * bridge-registered.
 */
export function getBridgeEntry(kind: string): StepKindBridgeEntry | undefined {
  for (const entry of STEP_KIND_BRIDGE_REGISTRY) {
    if (entry.kind === kind) {
      return entry;
    }
  }

  return undefined;
}
