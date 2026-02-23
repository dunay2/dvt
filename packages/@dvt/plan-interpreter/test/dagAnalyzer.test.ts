/**
 * @file packages/@dvt/plan-interpreter/test/dagAnalyzer.test.ts
 * @baseline ADR-0003: Execution Model Sovereignty
 * @decision Decision — Golden-path tests verify identical execution order across all adapters
 * @consequence Any adapter consuming @dvt/plan-interpreter is guaranteed to produce the same layer structure
 * @version 1.0.0
 * @date 2026-02-23
 */
import { describe, expect, it } from 'vitest';

import { planExecutionLayers, validateDag, PlanValidationError } from '../src/index.js';
import type { PlanStep } from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function layerIds(layers: PlanStep[][]): string[][] {
  return layers.map((layer) => layer.map((s) => s.stepId));
}

// ---------------------------------------------------------------------------
// Golden-path execution order tests
// These are the canonical fixtures. All adapters MUST produce identical results.
// ---------------------------------------------------------------------------

describe('planExecutionLayers — golden-path execution order', () => {
  it('GP-1: empty plan produces no layers', () => {
    expect(planExecutionLayers([])).toEqual([]);
  });

  it('GP-2: single step produces one layer', () => {
    const steps: PlanStep[] = [{ stepId: 'only' }];
    expect(layerIds(planExecutionLayers(steps))).toEqual([['only']]);
  });

  it('GP-3: sequential steps without dependsOn produce one layer per step (declaration order)', () => {
    const steps: PlanStep[] = [{ stepId: 'a' }, { stepId: 'b' }, { stepId: 'c' }];
    expect(layerIds(planExecutionLayers(steps))).toEqual([['a'], ['b'], ['c']]);
  });

  it('GP-4: diamond DAG produces correct parallel layers', () => {
    const steps: PlanStep[] = [
      { stepId: 'a' },
      { stepId: 'b', dependsOn: ['a'] },
      { stepId: 'c', dependsOn: ['a'] },
      { stepId: 'd', dependsOn: ['b', 'c'] },
    ];
    expect(layerIds(planExecutionLayers(steps))).toEqual([['a'], ['b', 'c'], ['d']]);
  });

  it('GP-5: wide fan-out produces two layers', () => {
    const steps: PlanStep[] = [
      { stepId: 'root' },
      { stepId: 'leaf-1', dependsOn: ['root'] },
      { stepId: 'leaf-2', dependsOn: ['root'] },
      { stepId: 'leaf-3', dependsOn: ['root'] },
      { stepId: 'leaf-4', dependsOn: ['root'] },
    ];
    expect(layerIds(planExecutionLayers(steps))).toEqual([
      ['root'],
      ['leaf-1', 'leaf-2', 'leaf-3', 'leaf-4'],
    ]);
  });

  it('GP-6: deep chain produces one step per layer', () => {
    const steps: PlanStep[] = [
      { stepId: 'a' },
      { stepId: 'b', dependsOn: ['a'] },
      { stepId: 'c', dependsOn: ['b'] },
      { stepId: 'd', dependsOn: ['c'] },
    ];
    expect(layerIds(planExecutionLayers(steps))).toEqual([['a'], ['b'], ['c'], ['d']]);
  });

  it('GP-7: multiple roots with shared fan-in', () => {
    const steps: PlanStep[] = [
      { stepId: 'src-a' },
      { stepId: 'src-b' },
      { stepId: 'stg-a', dependsOn: ['src-a'] },
      { stepId: 'stg-b', dependsOn: ['src-b'] },
      { stepId: 'mart', dependsOn: ['stg-a', 'stg-b'] },
    ];
    expect(layerIds(planExecutionLayers(steps))).toEqual([
      ['src-a', 'src-b'],
      ['stg-a', 'stg-b'],
      ['mart'],
    ]);
  });

  it('GP-8: mixed — some steps with deps, some without (all without-deps are roots)', () => {
    const steps: PlanStep[] = [
      { stepId: 'independent' },
      { stepId: 'root' },
      { stepId: 'child', dependsOn: ['root'] },
    ];
    // 'independent' and 'root' have no deps → both in layer 0
    // 'child' depends on 'root' → layer 1
    expect(layerIds(planExecutionLayers(steps))).toEqual([['independent', 'root'], ['child']]);
  });

  it('GP-9: duplicate dependency ids are deduplicated', () => {
    const steps: PlanStep[] = [{ stepId: 'a' }, { stepId: 'b', dependsOn: ['a', 'a'] }];
    expect(layerIds(planExecutionLayers(steps))).toEqual([['a'], ['b']]);
  });

  it('GP-10: preserves declaration order within layers', () => {
    // Steps z, y, x all depend on 'root'. Output order must match input order.
    const steps: PlanStep[] = [
      { stepId: 'root' },
      { stepId: 'z', dependsOn: ['root'] },
      { stepId: 'y', dependsOn: ['root'] },
      { stepId: 'x', dependsOn: ['root'] },
    ];
    expect(layerIds(planExecutionLayers(steps))).toEqual([['root'], ['z', 'y', 'x']]);
  });

  it('GP-11: large dbt-like DAG (20 nodes, 4 layers)', () => {
    // Simulates: 5 sources → 5 staging → 5 intermediate → 5 marts
    const sources = Array.from({ length: 5 }, (_, i) => ({
      stepId: `src_${i}`,
    }));
    const staging = Array.from({ length: 5 }, (_, i) => ({
      stepId: `stg_${i}`,
      dependsOn: [`src_${i}`],
    }));
    const intermediate = Array.from({ length: 5 }, (_, i) => ({
      stepId: `int_${i}`,
      dependsOn: [`stg_${i}`],
    }));
    const marts = Array.from({ length: 5 }, (_, i) => ({
      stepId: `mart_${i}`,
      dependsOn: [`int_${i}`],
    }));

    const steps: PlanStep[] = [...sources, ...staging, ...intermediate, ...marts];
    const layers = planExecutionLayers(steps);

    expect(layers).toHaveLength(4);
    expect(layerIds(layers)[0]).toEqual(['src_0', 'src_1', 'src_2', 'src_3', 'src_4']);
    expect(layerIds(layers)[1]).toEqual(['stg_0', 'stg_1', 'stg_2', 'stg_3', 'stg_4']);
    expect(layerIds(layers)[2]).toEqual(['int_0', 'int_1', 'int_2', 'int_3', 'int_4']);
    expect(layerIds(layers)[3]).toEqual(['mart_0', 'mart_1', 'mart_2', 'mart_3', 'mart_4']);
  });
});

// ---------------------------------------------------------------------------
// Validation error tests
// ---------------------------------------------------------------------------

describe('planExecutionLayers — validation errors', () => {
  it('throws DUPLICATE_STEP_ID on duplicate step ids', () => {
    const steps: PlanStep[] = [{ stepId: 'a' }, { stepId: 'a' }];
    expect(() => planExecutionLayers(steps)).toThrow('INVALID_PLAN_SCHEMA: duplicate_step_id:a');
    expect(() => planExecutionLayers(steps)).toThrow(PlanValidationError);
  });

  it('throws UNKNOWN_DEPENDENCY on reference to non-existent step', () => {
    const steps: PlanStep[] = [{ stepId: 'a' }, { stepId: 'b', dependsOn: ['missing'] }];
    expect(() => planExecutionLayers(steps)).toThrow(
      'INVALID_PLAN_SCHEMA: unknown_dependency:b->missing'
    );
  });

  it('throws SELF_DEPENDENCY on self-referencing step', () => {
    const steps: PlanStep[] = [{ stepId: 'a', dependsOn: ['a'] }];
    expect(() => planExecutionLayers(steps)).toThrow('INVALID_PLAN_SCHEMA: self_dependency:a');
  });

  it('throws CYCLIC_DEPENDENCIES on circular dependency', () => {
    const steps: PlanStep[] = [
      { stepId: 'a', dependsOn: ['b'] },
      { stepId: 'b', dependsOn: ['a'] },
    ];
    expect(() => planExecutionLayers(steps)).toThrow(
      'INVALID_PLAN_SCHEMA: cyclic_dependencies_detected'
    );
  });

  it('throws INVALID_DEPENDENCY_VALUE on empty string dependency', () => {
    const steps: PlanStep[] = [{ stepId: 'a' }, { stepId: 'b', dependsOn: ['a', ''] }];
    expect(() => planExecutionLayers(steps)).toThrow(
      'INVALID_PLAN_SCHEMA: invalid_dependency_value:b'
    );
  });

  it('throws CYCLIC_DEPENDENCIES on 3-node cycle', () => {
    const steps: PlanStep[] = [
      { stepId: 'a', dependsOn: ['c'] },
      { stepId: 'b', dependsOn: ['a'] },
      { stepId: 'c', dependsOn: ['b'] },
    ];
    expect(() => planExecutionLayers(steps)).toThrow(
      'INVALID_PLAN_SCHEMA: cyclic_dependencies_detected'
    );
  });

  it('PlanValidationError has correct code property', () => {
    const steps: PlanStep[] = [{ stepId: 'a' }, { stepId: 'a' }];
    try {
      planExecutionLayers(steps);
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(PlanValidationError);
      expect((err as PlanValidationError).code).toBe('DUPLICATE_STEP_ID');
    }
  });
});

// ---------------------------------------------------------------------------
// validateDag tests
// ---------------------------------------------------------------------------

describe('validateDag', () => {
  it('returns correct metadata for diamond DAG', () => {
    const steps: PlanStep[] = [
      { stepId: 'a' },
      { stepId: 'b', dependsOn: ['a'] },
      { stepId: 'c', dependsOn: ['a'] },
      { stepId: 'd', dependsOn: ['b', 'c'] },
    ];
    const result = validateDag(steps);
    expect(result).toEqual({
      stepCount: 4,
      layerCount: 3,
      maxParallelism: 2,
      hasExplicitDependencies: true,
    });
  });

  it('returns correct metadata for sequential plan', () => {
    const steps: PlanStep[] = [{ stepId: 'a' }, { stepId: 'b' }, { stepId: 'c' }];
    const result = validateDag(steps);
    expect(result).toEqual({
      stepCount: 3,
      layerCount: 3,
      maxParallelism: 1,
      hasExplicitDependencies: false,
    });
  });

  it('returns correct metadata for empty plan', () => {
    const result = validateDag([]);
    expect(result).toEqual({
      stepCount: 0,
      layerCount: 0,
      maxParallelism: 0,
      hasExplicitDependencies: false,
    });
  });

  it('throws on invalid DAG (same errors as planExecutionLayers)', () => {
    const steps: PlanStep[] = [
      { stepId: 'a', dependsOn: ['b'] },
      { stepId: 'b', dependsOn: ['a'] },
    ];
    expect(() => validateDag(steps)).toThrow(PlanValidationError);
  });
});

// ---------------------------------------------------------------------------
// Generic type compatibility tests
// ---------------------------------------------------------------------------

describe('planExecutionLayers — generic type compatibility', () => {
  it('works with extended step types (adapter-specific fields preserved)', () => {
    interface DbtStep extends PlanStep {
      kind: 'model' | 'seed' | 'test';
      schema?: string;
    }

    const steps: DbtStep[] = [
      { stepId: 'seed_customers', kind: 'seed' },
      { stepId: 'model_orders', kind: 'model', dependsOn: ['seed_customers'], schema: 'public' },
      { stepId: 'test_orders', kind: 'test', dependsOn: ['model_orders'] },
    ];

    const layers = planExecutionLayers(steps);
    expect(layers).toHaveLength(3);

    // Verify extended fields are preserved in output
    expect(layers[0]![0]!.kind).toBe('seed');
    expect(layers[1]![0]!.kind).toBe('model');
    expect(layers[1]![0]!.schema).toBe('public');
    expect(layers[2]![0]!.kind).toBe('test');
  });
});
