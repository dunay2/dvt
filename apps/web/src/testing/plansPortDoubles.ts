/** Owned concern: provide deterministic plans-port behavior for frontend tests. */
import type { IPlansPort } from '../app/ports/plans';
import { mockExecutionPlan } from './fixtures/mockDbtData';

export function createMockPlansService(): IPlansPort {
  return {
    previewPlan: async () => ({ ...mockExecutionPlan }),
    importPlan: async () => ({ ...mockExecutionPlan }),
  };
}
