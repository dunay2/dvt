import { mockExecutionPlan } from '../../data/mockDbtData';
import { useSessionStore } from '../../stores/sessionStore';
import type { ExecutionPlan } from '../../types/dbt';
import type { PlanRef, RunContext } from '../../types/engine';
import { type ApiClient, createApiClient } from '../api/createApiClient';
import { resolveDataSource, type DataSourceMode } from '../config/dataSource';

export type PlanPreviewInput = {
  selectedNodeIds: string[];
  context: RunContext;
  planName?: string;
};

export interface PlansService {
  previewPlan: (input: PlanPreviewInput) => Promise<ExecutionPlan>;
  importPlan: (planRef: PlanRef, context: RunContext) => Promise<ExecutionPlan>;
}

function createMockPlansService(): PlansService {
  return {
    previewPlan: async () => ({ ...mockExecutionPlan }),
    importPlan: async () => ({ ...mockExecutionPlan }),
  };
}

function createApiPlansService(apiClient: ApiClient): PlansService {
  return {
    previewPlan: (input) =>
      apiClient.postJson<PlanPreviewInput, ExecutionPlan>('/plans/preview', input),
    importPlan: (planRef, context) =>
      apiClient.postJson<{ planRef: PlanRef; context: RunContext }, ExecutionPlan>('/plans/import', {
        planRef,
        context,
      }),
  };
}

export function createPlansService(
  mode: DataSourceMode = resolveDataSource(),
  apiClient: ApiClient = createApiClient()
): PlansService {
  if (mode === 'api') {
    return createApiPlansService(apiClient);
  }

  return createMockPlansService();
}

export function buildSessionRunContext(runId: string): RunContext {
  return useSessionStore.getState().buildRunContext(runId);
}
