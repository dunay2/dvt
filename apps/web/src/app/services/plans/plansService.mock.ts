import { mockExecutionPlan } from '../../data/mockDbtData';
import { useSessionStore } from '../../stores/sessionStore';
import type { RunContext } from '../../types/engine';
import type { PlansService } from './plansService';

export function createMockPlansService(): PlansService {
  return {
    previewPlan: async () => ({ ...mockExecutionPlan }),
    importPlan: async () => ({ ...mockExecutionPlan }),
  };
}

export function buildSessionRunContext(runId: string): RunContext {
  return useSessionStore.getState().buildRunContext(runId);
}
