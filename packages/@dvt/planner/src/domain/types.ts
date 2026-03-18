/**
 * ADR baseline: ADR-0002-plan-core-hash + ADR-0006-extensibility
 *
 * Canonical contract types are re-exported from @dvt/contracts so that
 * internal domain files get the authoritative definition without importing
 * directly from the contracts package at every call site.
 *
 * Only planner-internal types (ResolvedPolicies, PlannerInputEnvelopeV2
 * pre-normalization form, NormalizedPlannerInput) are defined locally.
 */

import type {
  DbtManifestLike,
  ExecutionPlanV2,
  GraphNode,
  PlannerPolicyClassSet,
  PlannerSelection,
} from '@dvt/contracts';

// Canonical types — re-exported from @dvt/contracts (single source of truth).
export type {
  DbtManifestLike,
  ExecutionPlanV2,
  ExecutionStepV2,
  GraphNode,
  PlanCore,
  PlannerSelection,
  StepKind,
} from '@dvt/contracts';

// dbt step-kind constants (planner-local; not part of the public contract vocabulary).
export const DBT_MODEL = 'DBT_MODEL';
export const DBT_TEST = 'DBT_TEST';
export const DBT_SNAPSHOT = 'DBT_SNAPSHOT';

/**
 * Planner-internal resolved policy state.
 *
 * Derived from PlannerPolicyClassSet by resolvePolicies().
 * backoffMs is always 0 at the planner boundary — the adapter owns backoff strategy.
 */
export interface ResolvedPolicies {
  stepTimeoutMs?: number;
  retries?: {
    maxAttempts: number;
    backoffMs: number;
  };
  concurrency?: {
    maxInFlight: number;
  };
}

/**
 * Planner-internal raw input envelope (pre-normalization).
 *
 * Intentionally differs from the public PlannerInputEnvelopeV2 in @dvt/contracts:
 * - `nodes` is optional here because the planner can derive nodes from `manifest`
 * - `manifestRef` and `environment` are not present (handled at the application boundary)
 *
 * After InputEnvelopeValidator runs, the output is NormalizedPlannerInput where
 * `nodes` is always present.
 */
export interface PlannerInputEnvelopeV2 {
  manifest?: DbtManifestLike;
  nodes?: readonly GraphNode[];
  selection: PlannerSelection;
  policies?: PlannerPolicyClassSet;
  observability?: ExecutionPlanV2['observability'];
  // Volatile orchestration metadata — excluded from inputHashSha256.
  requestedBy?: string;
  requestId?: string;
  requestedAtIso?: string;
}

/**
 * Internal normalized form: nodes are always resolved (never undefined).
 * Produced after manifest derivation / validation.
 */
export type NormalizedPlannerInput = Omit<PlannerInputEnvelopeV2, 'nodes'> & {
  nodes: readonly GraphNode[];
};
