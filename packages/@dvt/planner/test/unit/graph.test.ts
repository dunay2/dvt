import { describe, it, expect } from 'vitest';

import { PlannerErrorCode } from '../../src/domain/errors.js';
import { Planner } from '../../src/domain/Planner.js';

describe('graph', () => {
  it('rejects missing dependency references', async () => {
    const planner = new Planner();
    await expect(
      planner.buildPlan({
        nodes: [{ nodeId: 'a', resourceType: 'model', dependsOn: ['missing'] }],
        selection: { selectedNodeIds: ['a'] },
      })
    ).rejects.toMatchObject({ code: PlannerErrorCode.INVALID_INPUT });
  });

  it('detects cycle in selected subgraph', async () => {
    const planner = new Planner();
    await expect(
      planner.buildPlan({
        nodes: [
          { nodeId: 'a', resourceType: 'model', dependsOn: ['b'] },
          { nodeId: 'b', resourceType: 'model', dependsOn: ['a'] },
        ],
        selection: { selectedNodeIds: ['a', 'b'] },
      })
    ).rejects.toMatchObject({ code: PlannerErrorCode.GRAPH_CYCLE });
  });

  it('detects self-cycle in selected subgraph', async () => {
    const planner = new Planner();
    await expect(
      planner.buildPlan({
        nodes: [{ nodeId: 'a', resourceType: 'model', dependsOn: ['a'] }],
        selection: { selectedNodeIds: ['a'] },
      })
    ).rejects.toMatchObject({ code: PlannerErrorCode.GRAPH_CYCLE });
  });

  it('detects selected cycle in a disconnected graph', async () => {
    const planner = new Planner();
    await expect(
      planner.buildPlan({
        nodes: [
          { nodeId: 'a', resourceType: 'model', dependsOn: ['b'] },
          { nodeId: 'b', resourceType: 'model', dependsOn: ['a'] },
          { nodeId: 'x', resourceType: 'model', dependsOn: [] },
          { nodeId: 'y', resourceType: 'model', dependsOn: ['x'] },
        ],
        selection: { selectedNodeIds: ['a', 'b'] },
      })
    ).rejects.toMatchObject({ code: PlannerErrorCode.GRAPH_CYCLE });
  });

  it('detects multiple disconnected cycles in selected subgraph', async () => {
    const planner = new Planner();
    await expect(
      planner.buildPlan({
        nodes: [
          { nodeId: 'a', resourceType: 'model', dependsOn: ['b'] },
          { nodeId: 'b', resourceType: 'model', dependsOn: ['a'] },
          { nodeId: 'c', resourceType: 'model', dependsOn: ['d'] },
          { nodeId: 'd', resourceType: 'model', dependsOn: ['c'] },
          { nodeId: 'x', resourceType: 'model', dependsOn: [] },
        ],
        selection: { selectedNodeIds: ['a', 'b', 'c', 'd'] },
      })
    ).rejects.toMatchObject({ code: PlannerErrorCode.GRAPH_CYCLE });
  });

  it('allows acyclic selected branch when cycle exists outside selection', async () => {
    const planner = new Planner();
    const result = await planner.buildPlan({
      nodes: [
        { nodeId: 'a', resourceType: 'model', dependsOn: ['b'] },
        { nodeId: 'b', resourceType: 'model', dependsOn: ['a'] },
        { nodeId: 'x', resourceType: 'model', dependsOn: [] },
        { nodeId: 'y', resourceType: 'model', dependsOn: ['x'] },
      ],
      selection: { selectedNodeIds: ['y'], includeUpstream: true },
    });
    expect(result.plan.steps.map((step) => step.stepId)).toEqual(['x', 'y']);
  });

  it('emits deterministic cycle diagnostics for same input', async () => {
    const planner = new Planner();
    const input = {
      nodes: [
        { nodeId: 'a', resourceType: 'model', dependsOn: ['b'] },
        { nodeId: 'b', resourceType: 'model', dependsOn: ['a'] },
      ],
      selection: { selectedNodeIds: ['a', 'b'] },
    };
    const first = await planner.buildPlan(input).then(
      () => '',
      (error: Error) => error.message
    );
    const second = await planner.buildPlan(input).then(
      () => '',
      (error: Error) => error.message
    );
    expect(first).toContain('stuck nodeIds');
    expect(second).toBe(first);
  });
});
