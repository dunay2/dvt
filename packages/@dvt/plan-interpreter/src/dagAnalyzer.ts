/**
 * @file packages/@dvt/plan-interpreter/src/dagAnalyzer.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — DAG analysis and execution layer computation are shared across all adapters
 * @consequence Temporal, Conductor, and future adapters produce identical execution order for the same plan
 * @version 1.0.0
 * @date 2026-02-23
 */

import { PlanValidationError } from './errors.js';
import type { DagValidationResult, PlanStep } from './types.js';

/**
 * Computes deterministic execution layers from a plan's step array.
 *
 * Each layer contains steps that can execute in parallel (all dependencies
 * in prior layers are satisfied). Steps within a layer are ordered by their
 * position in the input array (declaration order) for determinism.
 *
 * When no step declares `dependsOn`, each step becomes its own layer
 * (sequential execution in declaration order).
 *
 * @param steps - Readonly array of plan steps. Must have unique stepIds.
 * @returns Array of layers. Each layer is an array of steps that can run in parallel.
 * @throws {PlanValidationError} on duplicate stepIds, unknown dependencies,
 *         self-dependencies, cyclic dependencies, or invalid dependency values.
 *
 * @example
 * ```ts
 * const layers = planExecutionLayers([
 *   { stepId: 'a' },
 *   { stepId: 'b', dependsOn: ['a'] },
 *   { stepId: 'c', dependsOn: ['a'] },
 *   { stepId: 'd', dependsOn: ['b', 'c'] },
 * ]);
 * // => [[a], [b, c], [d]]
 * ```
 */
export function planExecutionLayers<T extends PlanStep>(steps: ReadonlyArray<T>): T[][] {
  if (steps.length === 0) return [];

  validateNoDuplicateStepIds(steps);

  if (!hasExplicitDependencies(steps)) {
    return steps.map((step) => [step]);
  }

  const { remainingDeps, dependents } = buildDagMaps(steps);

  const consumed = new Set<string>();
  const layers: T[][] = [];
  let ready = steps.filter((step) => (remainingDeps.get(step.stepId) ?? 0) === 0);

  while (ready.length > 0) {
    layers.push([...ready]);
    const nextReadyIds = new Set<string>();
    for (const step of ready) {
      consumed.add(step.stepId);
      for (const dependentId of dependents.get(step.stepId) ?? []) {
        const nextCount = (remainingDeps.get(dependentId) ?? 0) - 1;
        remainingDeps.set(dependentId, nextCount);
        if (nextCount === 0) {
          nextReadyIds.add(dependentId);
        }
      }
    }
    ready = steps.filter((step) => nextReadyIds.has(step.stepId) && !consumed.has(step.stepId));
  }

  if (consumed.size !== steps.length) {
    throw new PlanValidationError(
      'CYCLIC_DEPENDENCIES',
      'INVALID_PLAN_SCHEMA: cyclic_dependencies_detected'
    );
  }

  return layers;
}

/**
 * Validates a plan's step DAG and returns structural metadata.
 *
 * Useful for pre-flight validation before submitting a plan to an adapter.
 * Throws on any structural error (same errors as `planExecutionLayers`).
 *
 * @param steps - Readonly array of plan steps.
 * @returns Validation result with step count, layer count, max parallelism.
 * @throws {PlanValidationError} on structural errors.
 */
export function validateDag<T extends PlanStep>(steps: ReadonlyArray<T>): DagValidationResult {
  const layers = planExecutionLayers(steps);
  const maxParallelism = layers.reduce((max, layer) => Math.max(max, layer.length), 0);

  return {
    stepCount: steps.length,
    layerCount: layers.length,
    maxParallelism,
    hasExplicitDependencies: hasExplicitDependencies(steps),
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function validateNoDuplicateStepIds<T extends PlanStep>(steps: ReadonlyArray<T>): void {
  const seenStepIds = new Set<string>();
  for (const step of steps) {
    if (!step.stepId || step.stepId.length === 0) {
      throw new PlanValidationError('EMPTY_STEP_ID', 'INVALID_PLAN_SCHEMA: empty_step_id');
    }
    if (seenStepIds.has(step.stepId)) {
      throw new PlanValidationError(
        'DUPLICATE_STEP_ID',
        `INVALID_PLAN_SCHEMA: duplicate_step_id:${step.stepId}`,
        step.stepId
      );
    }
    seenStepIds.add(step.stepId);
  }
}

function hasExplicitDependencies<T extends PlanStep>(steps: ReadonlyArray<T>): boolean {
  return steps.some((step) => Array.isArray(step.dependsOn));
}

function buildDagMaps<T extends PlanStep>(
  steps: ReadonlyArray<T>
): {
  remainingDeps: Map<string, number>;
  dependents: Map<string, string[]>;
} {
  const remainingDeps = new Map<string, number>();
  const dependents = new Map<string, string[]>();

  for (const step of steps) {
    remainingDeps.set(step.stepId, 0);
    dependents.set(step.stepId, []);
  }

  const stepIds = new Set(steps.map((step) => step.stepId));
  for (const step of steps) {
    for (const dep of normalizeDependsOn(step)) {
      if (!stepIds.has(dep)) {
        throw new PlanValidationError(
          'UNKNOWN_DEPENDENCY',
          `INVALID_PLAN_SCHEMA: unknown_dependency:${step.stepId}->${dep}`,
          `${step.stepId}->${dep}`
        );
      }
      if (dep === step.stepId) {
        throw new PlanValidationError(
          'SELF_DEPENDENCY',
          `INVALID_PLAN_SCHEMA: self_dependency:${step.stepId}`,
          step.stepId
        );
      }
      remainingDeps.set(step.stepId, (remainingDeps.get(step.stepId) ?? 0) + 1);
      const nextDependents = dependents.get(dep)!;
      nextDependents.push(step.stepId);
    }
  }
  return { remainingDeps, dependents };
}

function normalizeDependsOn<T extends PlanStep>(step: T): string[] {
  if (!Array.isArray(step.dependsOn)) {
    return [];
  }

  const deduped = new Set<string>();
  for (const dep of step.dependsOn) {
    if (typeof dep !== 'string' || dep.length === 0) {
      throw new PlanValidationError(
        'INVALID_DEPENDENCY_VALUE',
        `INVALID_PLAN_SCHEMA: invalid_dependency_value:${step.stepId}`,
        step.stepId
      );
    }
    deduped.add(dep);
  }

  return [...deduped];
}
