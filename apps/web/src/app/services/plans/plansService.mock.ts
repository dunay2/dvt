import { mockExecutionPlan } from '../../data/mockDbtData';
import type { IPlansPort } from '../../ports/plans';

export function createMockPlansService(): IPlansPort {
  return {
    previewPlan: async () => ({ ...mockExecutionPlan }),
    importPlan: async () => ({ ...mockExecutionPlan }),
  };
}
