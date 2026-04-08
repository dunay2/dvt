import { mockExecutionPlan } from '../../data/mockDbtData';
import type { PlansService } from './plansService';

export function createMockPlansService(): PlansService {
  return {
    previewPlan: async () => ({ ...mockExecutionPlan }),
    importPlan: async () => ({ ...mockExecutionPlan }),
  };
}
