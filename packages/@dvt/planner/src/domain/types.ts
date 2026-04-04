/**
 * ADR baseline: ADR-0002-plan-core-hash + ADR-0006-extensibility
 *
 * Canonical contract types are re-exported from @dvt/contracts so that
 * internal domain files get the authoritative definition without importing
 * directly from the contracts package at every call site.
 *
 * Only planner-internal types (PlannerInputEnvelopeV1 pre-normalization form,
 * NormalizedPlannerInput) are defined locally. ResolvedPolicies is now a
 * boundary type in @dvt/contracts — re-exported here for internal use.
 */

import type {
  ExecutionPlan,
  GraphNode,
  PlannerGraphSourceV1,
  PlannerPolicyClassSet,
  PlannerSelection,
} from '@dvt/contracts';

// Canonical types — re-exported from @dvt/contracts (single source of truth).
export type {
  DbtManifestLike,
  ExecutionPlan,
  ExecutionStepV1,
  GraphNode,
  PlanCore,
  PlannerGraphSourceV1,
  PlannerSelection,
  ResolvedPolicies,
  StepKind,
} from '@dvt/contracts';

// dbt step-kind constants (planner-local; not part of the public contract vocabulary).
export const DBT_MODEL = 'DBT_MODEL';
export const DBT_TEST = 'DBT_TEST';
export const DBT_SNAPSHOT = 'DBT_SNAPSHOT';

/**
 * Planner-internal raw input envelope (pre-normalization).
 *
 * Intentionally differs from the public PlannerInputEnvelopeV1 in @dvt/contracts:
 * - `graphSource` is optional because direct `nodes` remains a compatibility path
 * - `manifestRef` and `manifest` are not present - the PlannerFacade resolves or normalizes them before hand-off
 * - `environment` is not present - stripped by PlannerFacade at the application boundary
 *
 * After InputEnvelopeValidator runs, the output is NormalizedPlannerInput where
 * `nodes` is always present.
 */
export interface PlannerInputEnvelopeV1 {
  graphSource?: PlannerGraphSourceV1;
  nodes?: readonly GraphNode[];
  selection: PlannerSelection;
  policies?: PlannerPolicyClassSet;
  observability?: ExecutionPlan['observability'];
  // Volatile orchestration metadata — excluded from inputHashSha256.
  requestedBy?: string;
  requestId?: string;
  requestedAtIso?: string;
}

/**
 * Internal normalized form: nodes are always resolved (never undefined).
 * Produced after manifest derivation / validation.
 */
export type NormalizedPlannerInput = Omit<PlannerInputEnvelopeV1, 'nodes'> & {
  nodes: readonly GraphNode[];
};
