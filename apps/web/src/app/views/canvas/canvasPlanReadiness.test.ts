import { describe, expect, it } from 'vitest';

import { mockExecutionPlan } from '../../data/mockDbtData';
import { resolvePlanRefForStartRun } from './canvasPlanReadiness';

describe('canvasPlanReadiness', () => {
  it('returns planRef from the execution plan when available', () => {
    const planRef = resolvePlanRefForStartRun(mockExecutionPlan);

    expect(planRef).toEqual(mockExecutionPlan.planRef);
  });

  it('returns null when planRef is missing', () => {
    const planRef = resolvePlanRefForStartRun({
      ...mockExecutionPlan,
      planRef: undefined,
    });

    expect(planRef).toBeNull();
  });
});
