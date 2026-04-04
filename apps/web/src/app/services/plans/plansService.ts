import type { ExecutionPlan } from '../../types/dbt';
import type { PlanRef, RunContext } from '../../types/engine';
import { type ApiClient, createApiClient } from '../api/createApiClient';
import { resolveDataSource, type DataSourceMode } from '../config/dataSource';
import { createApiPlansService } from './plansService.api';
import {
  buildPlanRefFromPlan,
  buildSessionRunContext,
  createMockPlansService,
} from './plansService.mock';

export type PlanPreviewInput = {
  selectedNodeIds: string[];
  context: RunContext;
  planName?: string;
};

export interface PlansService {
  previewPlan: (input: PlanPreviewInput) => Promise<ExecutionPlan>;
  importPlan: (planRef: PlanRef, context: RunContext) => Promise<ExecutionPlan>;
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

export { buildSessionRunContext, buildPlanRefFromPlan };
