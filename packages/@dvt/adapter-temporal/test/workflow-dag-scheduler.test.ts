import { describe, expect, it } from 'vitest';

import { planExecutionLayers } from '../src/workflows/RunPlanWorkflow.js';

type Step = {
  stepId: string;
  kind?: string;
  dependsOn?: string[];
};

function ids(layers: Step[][]): string[][] {
  return layers.map((layer) => layer.map((s) => s.stepId));
}

describe('planExecutionLayers', () => {
  it('falls back to declaration-order sequential layers when no dependsOn is provided', () => {
    const steps: Step[] = [{ stepId: 'a' }, { stepId: 'b' }, { stepId: 'c' }];

    expect(ids(planExecutionLayers(steps))).toEqual([['a'], ['b'], ['c']]);
  });

  it('builds deterministic parallel layers from explicit dependencies', () => {
    const steps: Step[] = [
      { stepId: 'a' },
      { stepId: 'b', dependsOn: ['a'] },
      { stepId: 'c', dependsOn: ['a'] },
      { stepId: 'd', dependsOn: ['b', 'c'] },
    ];

    expect(ids(planExecutionLayers(steps))).toEqual([['a'], ['b', 'c'], ['d']]);
  });

  it('deduplicates repeated dependency ids', () => {
    const steps: Step[] = [{ stepId: 'a' }, { stepId: 'b', dependsOn: ['a', 'a'] }];

    expect(ids(planExecutionLayers(steps))).toEqual([['a'], ['b']]);
  });

  it('throws on unknown dependency', () => {
    const steps: Step[] = [{ stepId: 'a' }, { stepId: 'b', dependsOn: ['missing'] }];

    expect(() => planExecutionLayers(steps)).toThrow(
      'INVALID_PLAN_SCHEMA: unknown_dependency:b->missing'
    );
  });

  it('throws on self dependency', () => {
    const steps: Step[] = [{ stepId: 'a', dependsOn: ['a'] }];

    expect(() => planExecutionLayers(steps)).toThrow('INVALID_PLAN_SCHEMA: self_dependency:a');
  });

  it('throws on cycles', () => {
    const steps: Step[] = [
      { stepId: 'a', dependsOn: ['b'] },
      { stepId: 'b', dependsOn: ['a'] },
    ];

    expect(() => planExecutionLayers(steps)).toThrow(
      'INVALID_PLAN_SCHEMA: cyclic_dependencies_detected'
    );
  });

  it('throws on duplicate step ids', () => {
    const steps: Step[] = [{ stepId: 'a' }, { stepId: 'a' }];

    expect(() => planExecutionLayers(steps)).toThrow('INVALID_PLAN_SCHEMA: duplicate_step_id:a');
  });

  it('throws on invalid dependency value type', () => {
    const steps: Step[] = [{ stepId: 'a' }, { stepId: 'b', dependsOn: ['a', '' as string] }];

    expect(() => planExecutionLayers(steps)).toThrow(
      'INVALID_PLAN_SCHEMA: invalid_dependency_value:b'
    );
  });
});
