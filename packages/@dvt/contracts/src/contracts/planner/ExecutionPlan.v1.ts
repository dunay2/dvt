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
      /**
       * Deterministic fingerprint for plugin/runtime compatibility checks at
       * admission and replay boundaries.
       */
      pluginCompatibilityFingerprint?: string;
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

// ── Envelope ──────────────────────────────────────────────────────────────────

/**
 * Normative public planner input for v1.
 *
 * ## One-active-source rule
 *
 * Exactly **one** of `manifestRef` or `graphSource` may be active in a
 * single request. The planner MUST reject envelopes with:
 * - no graph source provided
 * - more than one graph source provided
 * - conflicting graph source content
 *
 * ## Graph source lifecycle
 *
 * - `manifestRef` is the artifact-ref path.
 * - `graphSource` is the canonical typed inline path.
 */
export interface PlannerInputEnvelopeV1 {
  /**
   * Immutable reference to a manifest artifact stored out-of-band.
   *
   * When provided, `graphSource` MUST NOT also be provided.
   */
  manifestRef?: DbtManifestRef;

  /**
   * Typed inline graph source.
   *
   * When provided, `manifestRef` MUST NOT also be provided.
   */
  graphSource?: GenericGraphSourceV1;

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
