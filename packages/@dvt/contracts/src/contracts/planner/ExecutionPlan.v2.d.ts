/**
 * Planner-side ExecutionPlan types (v2).
 *
 * This is the planner-side subset of the normative ExecutionPlan contract.
 * It uses `kind` and `stepTypeConfig` but does not include `gateway` or `dispatch`
 * (those are engine-specific interpretation fields).
 *
 * @see specs/contracts/engine/ExecutionPlan.v1.md — Normative prose contract
 * @see specs/contracts/engine/ExecutionPlan.v1.schema.json — JSON Schema (draft 2020-12)
 */
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
    sha256?: string;
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
/** Known planner policies + extension point for domain-specific policy blobs. */
export interface PlannerPolicies {
    stepTimeoutMs?: number;
    retries?: {
        maxAttempts: number;
        backoffMs: number;
    };
    concurrency?: {
        maxInFlight: number;
    };
    gatewayDslVersion?: string;
    custom?: Record<string, unknown>;
}
export interface PlannerSelection {
    selectedNodeIds: readonly string[];
    includeUpstream?: boolean;
    includeDownstream?: boolean;
}
export interface ExecutionStepV2 {
    stepId: string;
    kind: StepKind;
    dependsOn: readonly string[];
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
    observability?: {
        tags?: Record<string, string>;
        extra?: Record<string, unknown>;
        [k: string]: unknown;
    };
}
/**
 * Normative planner input for v2.
 *
 * - `manifest` / `manifestRef` are optional in this contract revision to keep
 *   compatibility with current callers that already submit expanded `nodes`.
 * - `nodes` + `selection` remain required and define the semantic planning set.
 */
export interface PlannerInputEnvelopeV2 {
    manifest?: DbtManifestLike;
    manifestRef?: DbtManifestRef;
    nodes: readonly GraphNode[];
    selection: PlannerSelection;
    policies?: PlannerPolicies;
    environment?: PlannerEnvironmentContext;
    observability?: ExecutionPlanV2['observability'];
    requestedBy?: string;
    requestId?: string;
    requestedAtIso?: string;
}
export interface PlannerBuildResultV2 {
    plan: ExecutionPlanV2;
    canonicalPlanJson: string;
}
/** Backward-compatible aliases for existing naming in consumers/docs. */
export type ExecutionPlan = ExecutionPlanV2;
export type PlannerInputEnvelope = PlannerInputEnvelopeV2;
export type PlannerBuildResult = PlannerBuildResultV2;
//# sourceMappingURL=ExecutionPlan.v2.d.ts.map