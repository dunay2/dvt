import { describe, it, expect } from 'vitest';

import { PlannerError, PlannerErrorCode } from '../../src/domain/errors.js';
import { Planner } from '../../src/domain/Planner.js';

describe('limits', () => {
  it('enforces maxNodes on manifest', async () => {
    const planner = new Planner({ limits: { maxNodes: 1 } });

    const p = planner.buildPlan({
      graphSource: {
        nodes: [
          { nodeId: 'a', stepKind: 'DBT_MODEL', dependsOn: [] },
          { nodeId: 'b', stepKind: 'DBT_MODEL', dependsOn: [] },
        ],
      },
      selection: { selectedNodeIds: ['a'] },
    });

    await expect(p).rejects.toBeInstanceOf(PlannerError);
    await expect(p).rejects.toMatchObject({ code: PlannerErrorCode.LIMIT_EXCEEDED });
  });

  it('enforces maxPlanSizeBytes', async () => {
    const planner = new Planner({ limits: { maxPlanSizeBytes: 10 } }); // absurdly small

    const p = planner.buildPlan({
      graphSource: { nodes: [{ nodeId: 'a', stepKind: 'DBT_MODEL', dependsOn: [] }] },
      selection: { selectedNodeIds: ['a'] },
    });

    await expect(p).rejects.toMatchObject({ code: PlannerErrorCode.LIMIT_EXCEEDED });
  });
});
