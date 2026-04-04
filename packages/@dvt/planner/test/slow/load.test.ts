import { describe, it, expect } from 'vitest';

import { Planner } from '../../src/domain/Planner.js';

function buildLinearNodes(
  n: number
): { nodeId: string; resourceType: string; dependsOn: string[] }[] {
  const nodes: { nodeId: string; resourceType: string; dependsOn: string[] }[] = [];
  for (let i = 0; i < n; i += 1) {
    const id = `model.${i}`;
    const dependsOn = i === 0 ? [] : [`model.${i - 1}`];
    nodes.push({ nodeId: id, resourceType: 'model', dependsOn });
  }
  return nodes;
}

describe('load', () => {
  it('plans 1,000 nodes under timeout', async () => {
    const planner = new Planner({ limits: { timeoutMs: 15_000, maxNodes: 2_000 } });
    const nodes = buildLinearNodes(1_000);
    const { plan } = await planner.buildPlan({
      graphSource: { nodes },
      selection: { selectedNodeIds: [`model.${999}`], includeUpstream: true },
    });
    expect(plan.metadata.planId).toMatch(/^[a-f0-9]{64}$/);
  });

  it('enforces maxNodes at 5,000 when configured', async () => {
    const planner = new Planner({ limits: { maxNodes: 4_000 } });
    const nodes = buildLinearNodes(5_000);
    await expect(
      planner.buildPlan({
        graphSource: { nodes },
        selection: { selectedNodeIds: ['model.4999'], includeUpstream: true },
      })
    ).rejects.toBeDefined();
  });
});
