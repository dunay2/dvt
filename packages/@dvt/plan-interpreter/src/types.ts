/**
 * @file packages/@dvt/plan-interpreter/src/types.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — Plan step types are defined in a shared package so all adapters interpret plans identically
 * @consequence DAG analysis, layer computation, and validation are adapter-agnostic and testable in isolation
 * @version 1.0.0
 * @date 2026-02-23
 */

/**
 * Minimal step shape required for plan interpretation.
 *
 * Adapters and the engine may extend this with additional fields
 * (e.g., `kind`) via intersection types.
 * The plan interpreter only reads `stepId` and `dependsOn`.
 */
export interface PlanStep {
  readonly stepId: string;
  readonly dependsOn?: readonly string[];
}

/**
 * Result of DAG validation. Contains the validated step graph metadata.
 */
export interface DagValidationResult {
  /** Total number of steps in the plan. */
  stepCount: number;
  /** Number of execution layers (depth of the DAG). */
  layerCount: number;
  /** Maximum parallelism (widest layer). */
  maxParallelism: number;
  /** True if any step declares explicit dependencies. */
  hasExplicitDependencies: boolean;
}

/**
 * Error codes emitted by plan interpretation functions.
 * Machine-readable, stable across versions.
 */
export type PlanValidationErrorCode =
  | 'DUPLICATE_STEP_ID'
  | 'UNKNOWN_DEPENDENCY'
  | 'SELF_DEPENDENCY'
  | 'CYCLIC_DEPENDENCIES'
  | 'INVALID_DEPENDENCY_VALUE'
  | 'EMPTY_STEP_ID';
