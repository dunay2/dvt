import { mockExecutionPlan } from '../../data/mockDbtData';
import { useSessionStore } from '../../stores/sessionStore';
import type { ExecutionPlan } from '../../types/dbt';
import type { PlanRef, RunContext } from '../../types/engine';
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

/**
 * Constructs a PlanRef from a previewed ExecutionPlan for use in startRun.
 * The uri uses a dvt:// scheme; sha256 is a placeholder for mock mode.
 * In API mode the backend validates the plan by planId, not sha256.
 */
export function buildPlanRefFromPlan(plan: ExecutionPlan): PlanRef {
  return {
    uri: `dvt://plans/${plan.planId}`,
    sha256: '0000000000000000000000000000000000000000000000000000000000000000',
    schemaVersion: '2.0.0',
    planId: plan.planId,
    planVersion: plan.planVersion,
  };
}
