/**
 * ADR baseline: ADR-0002-plan-core-hash + ADR-0006-extensibility
 */

export type StepKind = string;

export type DbtManifestLike = Record<string, unknown>;

// dbt defaults as string literals (backward compatible)
export const DBT_MODEL = 'DBT_MODEL';
export const DBT_TEST = 'DBT_TEST';
export const DBT_SNAPSHOT = 'DBT_SNAPSHOT';

export interface GraphNode {
  /** Stable node identifier (content-addressable at graph level). */
  nodeId: string;
  /** Domain classification (dbt: model/test/snapshot; other domains free-form). */
  resourceType: string;
  /** Node dependency ids. Must reference existing nodeIds. */
  dependsOn: readonly string[];
}

/** Known planner policies (resolved by core), plus passthrough for custom domains. */
export interface PlannerPolicies {
  stepTimeoutMs?: number;
  retries?: {
    maxAttempts: number;
    backoffMs: number;
  };
  concurrency?: {
    maxInFlight: number;
  };
  /** Domain-specific blob that planner does not interpret. */
  custom?: Record<string, unknown>;
}

export interface ResolvedPolicies {
  stepTimeoutMs: number;
  retries: {
    maxAttempts: number;
    backoffMs: number;
  };
  concurrency: {
    maxInFlight: number;
  };
  custom: Record<string, unknown>;
}

export interface PlannerSelection {
  selectedNodeIds: readonly string[];
  includeUpstream?: boolean;
  includeDownstream?: boolean;
}

export interface ExecutionStepV2 {
  /** MUST be stable. In v2.3.x: stepId === nodeId (no prefixes). */
  stepId: string;
  /** Extensible kind (string). dbt uses DBT_* constants. */
  kind: StepKind;
  /** Deterministically sorted dependency stepIds. */
  dependsOn: readonly string[];
  /** Optional domain-specific config for the step type. */
  stepTypeConfig?: Record<string, unknown>;
}

export interface PlanCore {
  metadata: {
    planVersion: '2.3';
    inputHashSha256: string;
  };
  steps: readonly ExecutionStepV2[];
}

export interface ExecutionPlanV2 extends PlanCore {
  metadata: PlanCore['metadata'] & {
    planId: string;
    createdAtIso: string;
  };
  /**
   * Observability is post-hash (must not affect planId).
   * Use for correlation tags, tenant info, user info, etc.
   */
  observability?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    [k: string]: unknown;
  };
}

export interface PlannerInputEnvelopeV2 {
  /** Optional dbt manifest payload; if provided and `nodes` is omitted, nodes are derived from manifest. */
  manifest?: DbtManifestLike;
  nodes?: readonly GraphNode[];
  selection: PlannerSelection;
  policies?: PlannerPolicies;
  observability?: ExecutionPlanV2['observability'];
  // Volatile / orchestration metadata (excluded from inputHashSha256):
  requestedBy?: string;
  requestId?: string;
  requestedAtIso?: string;
}
