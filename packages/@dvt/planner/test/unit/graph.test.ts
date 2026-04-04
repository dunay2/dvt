import { describe, it, expect } from 'vitest';

import { PlannerErrorCode } from '../../src/domain/errors.js';
import { Planner } from '../../src/domain/Planner.js';

describe('graph', () => {
  it('rejects missing dependency references', async () => {
    const planner = new Planner();
    await expect(
      planner.buildPlan({
        graphSource: { nodes: [{ nodeId: 'a', resourceType: 'model', dependsOn: ['missing'] }] },
        selection: { selectedNodeIds: ['a'] },
      })
    ).rejects.toMatchObject({ code: PlannerErrorCode.INVALID_INPUT });
  });

  it('detects cycle in selected subgraph', async () => {
    const planner = new Planner();
    await expect(
      planner.buildPlan({
        graphSource: {
          nodes: [
            { nodeId: 'a', resourceType: 'model', dependsOn: ['b'] },
            { nodeId: 'b', resourceType: 'model', dependsOn: ['a'] },
          ],
        },
        selection: { selectedNodeIds: ['a', 'b'] },
      })
    ).rejects.toMatchObject({ code: PlannerErrorCode.GRAPH_CYCLE });
  });
});
