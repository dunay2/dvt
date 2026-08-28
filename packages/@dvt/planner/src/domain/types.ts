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
  PlanOwnership,
  PlannerPolicyClassSet,
  PlannerSelection,
} from '@dvt/contracts';

// Canonical types — re-exported from @dvt/contracts (single source of truth).
export type {
  ExecutionPlan,
  ExecutionStepV1,
  PlanCore,
  PlannerSelection,
  ResolvedPolicies,
  StepKind,
} from '@dvt/contracts';

export interface GraphNode {
  nodeId: string;
  stepKind: string;
  dependsOn: readonly string[];
  stepTypeConfig?: Record<string, unknown>;
  metadata?: {
    displayName?: string;
    sourceRef?: string;
    tags?: Record<string, string>;
  };
}

// dbt step-kind constants (planner-local; not part of the public contract vocabulary).
export const DBT_MODEL = 'DBT_MODEL';
export const DBT_TEST = 'DBT_TEST';
export const DBT_SNAPSHOT = 'DBT_SNAPSHOT';

/**
 * Planner-internal raw input envelope (pre-normalization).
 *
 * Intentionally differs from source-native/API inputs: legacy DBT-native
 * ingress and environment-dependent configuration are resolved outside the
 * planner kernel before admission.
 *
 * After InputEnvelopeValidator runs, the output is NormalizedPlannerInput where
 * `nodes` is always present.
 */
export interface PlannerInputEnvelopeV1 {
  graphSource: {
    nodes: readonly GraphNode[];
  };
  selection: PlannerSelection;
  decisionScope?: {
    readonly nodeIds: readonly string[];
    readonly requestedRootNodeIds?: readonly string[];
  };
  policies?: PlannerPolicyClassSet;
  ownership?: PlanOwnership;
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
