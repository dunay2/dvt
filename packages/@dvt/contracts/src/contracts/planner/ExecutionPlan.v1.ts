/**
 * @file packages/@dvt/contracts/src/contracts/planner/ExecutionPlan.v1.ts
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Logical transformation semantics stay outside ExecutionPlan; plan steps represent runtime responsibilities only.
 * @consequence Substrait relation/operator count cannot implicitly become ExecutionPlan step count.
 * @version 1.0.0
 * @date 2026-08-24
 *
 * Planner-side ExecutionPlan types (v1).
 *
 * This is the planner-side subset of the normative ExecutionPlan contract.
 * It uses `kind` and `stepTypeConfig` but does not include `gateway` or `dispatch`
 * (those are engine-specific interpretation fields).
 *
 * @see specs/contracts/engine/ExecutionPlan.v1.md — Normative prose contract
 * @see specs/contracts/engine/ExecutionPlan.v1.schema.json — JSON Schema (draft 2020-12)
 */

import type { RunExecutionPolicy } from '../engine/RunExecutionPolicy.v1.js';

import type { PlanExecutionDecision } from './PlanExecutionDecision.v1.js';
import type { PlannerPolicyClassSet } from './PlannerPolicyVocabulary.v2.js';
import type { SupportedPlanVersion } from './PlanVersion.v1.js';

export type StepKind = string;

/**
 * Canonical generic graph-source boundary for multi-workflow planning.
 *
 * Runtime execution support by step kind remains
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

/**
 * Authorization-relevant ownership carried with a persisted executable plan.
 *
 * This is distinct from observability tags:
 * - observability supports diagnosis and routing
 * - ownership defines the canonical tenant/project/environment scope that
 *   imported plans must satisfy
 *
 * Ownership is intentionally post-hash metadata and MUST NOT affect
 * `inputHashSha256` or `planId`.
 */
export interface PlanOwnership {
  tenantId: string;
  projectId: string;
  environmentId: string;
}

/**
 * Explicit per-step activity retry profile materialized into the executable
 * plan.
 *
 * `maxAttempts` counts total attempts, including the first execution.
 * Interval fields intentionally use Temporal-compatible duration strings
 * because the current adapter is the only production runtime and the review
 * task for AR-A11 requires the plan to own the realized retry/backoff shape.
 */
export interface ExecutionStepRetryPolicyV1 {
  maxAttempts: number;
  initialInterval: `${number}s`;
  maximumInterval: `${number}s`;
  backoffCoefficient: number;
}

export interface ExecutionStepV1 {
  stepId: string;
  kind: StepKind;
  dependsOn: readonly string[];
  /**
   * Canonical per-step retry policy consumed by the runtime adapter.
   */
  retryPolicy?: ExecutionStepRetryPolicyV1;
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

export const CURRENT_EXECUTION_PLAN_SCHEMA_VERSION = '1.0' as const;
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
      ownership?: PlanOwnership;
      plannerVersion?: string;
      plannerGitSha?: string;
    };
    observability?: {
      tags?: Record<string, string>;
      extra?: Record<string, unknown>;
      [k: string]: unknown;
    };
    /** Deterministic planner explanation persisted with the immutable plan. */
    decisions?: readonly PlanExecutionDecision[];
  };

export type ExecutionPlan = {
  [TVersion in SupportedPlanVersion]: VersionedExecutionPlan<TVersion>;
}[SupportedPlanVersion];

// ── Envelope ──────────────────────────────────────────────────────────────────

/**
 * Normative public planner input for v1.
 *
 * `graphSource` is the canonical planner ingress.
 * Environment-dependent values MUST be resolved upstream into explicit graph,
 * policy or step configuration before planner admission.
 *
 * Compatibility translation from source-native inputs such as DBT manifest refs
 * happens outside this shared-kernel contract before planner admission.
 */
export interface PlannerInputEnvelopeV1 {
  /**
   * Typed inline graph source.
   */
  graphSource: GenericGraphSourceV1;

  selection: PlannerSelection;
  /**
   * Authorized planner subject universe used only to explain persisted
   * RUN/SKIP/PARTIAL decisions. It may be wider than the executable graphSource.
   */
  decisionScope?: {
    readonly nodeIds: readonly string[];
    /** Original operator-selected roots before executable-closure expansion. */
    readonly requestedRootNodeIds?: readonly string[];
  };
  policies?: PlannerPolicyClassSet;
  ownership?: PlanOwnership;
  observability?: ExecutionPlan['observability'];
  requestedBy?: string;
  requestId?: string;
  requestedAtIso?: string;
}

export interface PlannerBuildResultV1 {
  plan: ExecutionPlan;
  executionPolicy: RunExecutionPolicy;
  canonicalPlanCoreJson: string;
}
