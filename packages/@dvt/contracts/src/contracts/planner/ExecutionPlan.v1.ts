/**
 * Planner-side ExecutionPlan types (v1).
 *
 * This is the planner-side subset of the normative ExecutionPlan contract.
 * It uses `kind` and `stepTypeConfig` but does not include `gateway` or `dispatch`
 * (those are engine-specific interpretation fields).
 *
 * @see specs/contracts/engine/ExecutionPlan.v1.md — Normative prose contract
 * @see specs/contracts/engine/ExecutionPlan.v1.schema.json — JSON Schema (draft 2020-12)
 */

import type { PlannerPolicyClassSet } from './PlannerPolicyVocabulary.v2.js';
import type { SupportedPlanVersion } from './PlanVersion.v1.js';

export type StepKind = string;

/**
 * Raw dbt manifest payload (or equivalent planning graph artifact)
 * passed at the planner boundary.
 */
export type DbtManifestLike = Record<string, unknown>;

/**
 * Immutable reference to a manifest artifact stored out-of-band.
 */
export interface DbtManifestRef {
  uri: string;
  sha256: string;
  artifactId?: string;
}

/**
 * Optional planning context used to bind environment-dependent knobs
 * without coupling planner logic to runtime adapters.
 */
export interface PlannerEnvironmentContext {
  environmentId?: string;
  targetProfile?: string;
  vars?: Record<string, unknown>;
}

export interface GraphNode {
  nodeId: string;
  resourceType: string;
  dependsOn: readonly string[];
}

/**
 * Canonical typed inline graph-source boundary for planner ingestion.
 *
 * This keeps the public planner edge generic while allowing callers to pass
 * a fully normalized dependency graph without exposing DBT artifact structure
 * as the long-term semantic contract.
 */
export const PLANNER_GRAPH_SOURCE_KIND = 'normalized-graph-v1' as const;

export interface PlannerGraphSourceV1 {
  kind: typeof PLANNER_GRAPH_SOURCE_KIND;
  nodes: readonly GraphNode[];
}

/**
 * Canonical generic graph-source boundary for multi-workflow planning.
 *
 * This is additive in MW-A2-B. Runtime execution support by step kind remains
 * governed by planner/engine registry and adapter slices.
 */
export const GENERIC_GRAPH_SOURCE_KIND = 'generic-graph-v1' as const;

export interface GenericGraphNodeV1 {
  nodeId: string;
  stepKind: StepKind;
  dependsOn: readonly string[];
  stepTypeConfig?: Record<string, unknown>;
  metadata?: {
    displayName?: string;
    sourceRef?: string;
    tags?: Record<string, string>;
  };
}

export interface GenericGraphSourceV1 {
  kind: typeof GENERIC_GRAPH_SOURCE_KIND;
  sourceFamily: string;
  sourceVersion: string;
  nodes: readonly GenericGraphNodeV1[];
}

export interface PlannerSelection {
  selectedNodeIds: readonly string[];
  includeUpstream?: boolean;
  includeDownstream?: boolean;
}

export interface ExecutionStepV1 {
  stepId: string;
  kind: StepKind;
  dependsOn: readonly string[];
  /**
   * Kind-specific configuration blob.
   *
   * Runtime type is intentionally `Record<string, unknown>` to support arbitrary step kinds
   * without coupling the contract to any specific adapter.
   *
   * For built-in DBT kinds (DBT_MODEL, DBT_TEST, DBT_SNAPSHOT) the canonical shape is
   * `DbtStepTypeConfig` from `@dvt/contracts/step-registry`.
   *
   * Validation at plan build-time is enforced by `IStepTypeRegistry` in the Planner.
   * Validation at adapter consumption is enforced by `DbtStepTypeConfigSchema.safeParse`.
   *
   * @see IStepTypeRegistry — registry contract (G9)
   * @see DbtStepTypeConfig — typed config for DBT_* kinds
   */
  stepTypeConfig?: Record<string, unknown>;
  type?: 'task' | 'gateway';
  gateway?: {
    dslVersion: '1.0';
    expression: string;
  };
}

export type ExecutionStep = ExecutionStepV1;

export const CURRENT_EXECUTION_PLAN_SCHEMA_VERSION = 'v1.2' as const;
export const CURRENT_EXECUTION_PLAN_CONTRACT_VERSION = '1.0.0' as const;

export type VersionedPlanCore<TVersion extends SupportedPlanVersion> = {
  metadata: {
    planVersion: TVersion;
    inputHashSha256: string;
  };
  steps: readonly ExecutionStepV1[];
};

export type PlanCore = {
  [TVersion in SupportedPlanVersion]: VersionedPlanCore<TVersion>;
}[SupportedPlanVersion];

export type VersionedExecutionPlan<TVersion extends SupportedPlanVersion> =
  VersionedPlanCore<TVersion> & {
    metadata: VersionedPlanCore<TVersion>['metadata'] & {
      schemaVersion: typeof CURRENT_EXECUTION_PLAN_SCHEMA_VERSION;
      contractVersion: typeof CURRENT_EXECUTION_PLAN_CONTRACT_VERSION;
      planId: string;
      createdAtIso: string;
      plannerVersion?: string;
      plannerGitSha?: string;
      requiresCapabilities?: readonly string[];
      fallbackBehavior?: 'reject' | 'emulate' | 'degrade';
      targetAdapter?: 'temporal' | 'conductor' | 'any' | 'mock';
    };
    observability?: {
      tags?: Record<string, string>;
      extra?: Record<string, unknown>;
      [k: string]: unknown;
    };
  };

export type ExecutionPlan = {
  [TVersion in SupportedPlanVersion]: VersionedExecutionPlan<TVersion>;
}[SupportedPlanVersion];

// ── Graph-source compatibility policy ────────────────────────────────────────

/**
 * Canonical governance note for graph source compatibility paths (Stage 1.1, G-01.10).
 *
 * ## One-active-source rule
 *
 * `PlannerInputEnvelopeV1` accepts exactly **one** active graph source per
 * request. Envelopes that provide no source or more than one MUST be rejected
 * at the planner boundary before graph build or hashing.
 *
 * ## Lifecycle of each source
 *
 * | Source        | Status                 | Notes |
 * |---------------|------------------------|-------|
 * | `manifestRef` | Canonical primary path | Preferred for all new callers. Immutable artifact-first planning. |
 * | `manifest`    | Compatibility-only     | Retained for callers that cannot yet supply a `manifestRef`. Subject to review. |
 * | `nodes`       | Compatibility-only     | Retained for callers that pre-normalize the graph. Subject to review. |
 *
 * ## Retention justification
 *
 * `manifest` and `nodes` are retained in Stage 1.1 to enable migration.
 * They do NOT have permanent equal-citizen status with `manifestRef`.
 * New planner capabilities MUST be defined against `manifestRef` first.
 *
 * ## Removal rule
 *
 * Either compatibility path (`manifest` or `nodes`) may be removed when ALL
 * of the following are true:
 * 1. An explicit deprecation ADR has been filed and merged.
 * 2. A review confirms no active production callers remain on the path.
 * 3. A migration guide is published pointing callers to `manifestRef`.
 * 4. The contracts package version is bumped to reflect the breaking change.
 *
 * ## Review trigger
 *
 * Each compatibility path MUST be reviewed at every major planner boundary
 * version bump. Absence of active callers at that review is the primary
 * removal signal.
 */
export const GRAPH_SOURCE_COMPATIBILITY_POLICY = {
  canonicalSource: 'manifestRef' as const,
  preferredInlineSource: 'graphSource' as const,
  compatibilityPaths: ['manifest', 'nodes'] as const,
  retentionJustification:
    'Required for migration and interop with callers that pre-date manifestRef support.',
  removalRule:
    'Requires deprecation ADR, no-active-callers review, migration guide, and contracts major version bump.',
  reviewTrigger:
    'Review at every major planner boundary version bump. Absence of active callers is the primary removal signal.',
} as const;

// ── Envelope ──────────────────────────────────────────────────────────────────

/**
 * Normative public planner input for v1.
 *
 * ## One-active-source rule
 *
 * Exactly **one** of `manifestRef`, `graphSource`, `manifest`, or `nodes` may be active in a
 * single request. The planner MUST reject envelopes with:
 * - no graph source provided
 * - more than one graph source provided
 * - conflicting graph source content
 *
 * ## Graph source lifecycle
 *
 * - `manifestRef` is the **canonical production path** — immutable, integrity-
 *   verified, preferred for all new callers.
 * - `graphSource` is the **canonical typed inline path** - preferred over raw
 *   manifest payloads when the caller already has a normalized graph.
 * - `manifest` and `nodes` are **compatibility-only** paths retained for
 *   migration. They do not have permanent equal-citizen status. See
 *   `GRAPH_SOURCE_COMPATIBILITY_POLICY` for the removal rule.
 *
 * @see GRAPH_SOURCE_COMPATIBILITY_POLICY — retention and removal governance
 * @see docs/planning/proposals/planner-stage-1-1-canonicalization.manifest.json G-01.10
 */
export interface PlannerInputEnvelopeV1 {
  /**
   * Immutable reference to a manifest artifact stored out-of-band.
   *
   * **Canonical production path.** Preferred for all new callers.
   * When provided, `graphSource`, `manifest`, and `nodes` MUST NOT also be provided.
   */
  manifestRef?: DbtManifestRef;

  /**
   * Typed inline graph source.
   *
   * Preferred for callers that already hold a normalized graph in memory and
   * do not need artifact resolution.
   *
   * When provided, `manifestRef`, `manifest`, and `nodes` MUST NOT also be provided.
   */
  graphSource?: PlannerGraphSourceV1;

  /**
   * Raw dbt manifest payload passed inline.
   *
   * **Compatibility path.** Retained for callers that cannot yet supply a
   * `manifestRef`. Subject to deprecation review. New callers SHOULD use
   * `manifestRef` instead.
   *
   * When provided, `manifestRef`, `graphSource`, and `nodes` MUST NOT also be provided.
   */
  manifest?: DbtManifestLike;

  /**
   * Pre-normalized graph nodes.
   *
   * **Compatibility path.** Retained for callers that pre-normalize the graph
   * before planning. Subject to deprecation review. New callers SHOULD use
   * `manifestRef` instead.
   *
   * When provided, `manifestRef`, `graphSource`, and `manifest` MUST NOT also be provided.
   */
  nodes?: readonly GraphNode[];

  selection: PlannerSelection;
  policies?: PlannerPolicyClassSet;
  environment?: PlannerEnvironmentContext;
  observability?: ExecutionPlan['observability'];
  requestedBy?: string;
  requestId?: string;
  requestedAtIso?: string;
}

export interface PlannerBuildResultV1 {
  plan: ExecutionPlan;
  canonicalPlanJson: string;
}

/** Backward-compatible aliases for existing naming in consumers/docs. */
export type PlannerInputEnvelope = PlannerInputEnvelopeV1;
export type PlannerBuildResult = PlannerBuildResultV1;
