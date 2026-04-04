import type { IPlansPort } from '../../ports/plans';
import { type ApiClient, createApiClient } from '../api/createApiClient';
import type { DataSourceMode } from '../config/dataSource';
import { createApiPlansService } from './plansService.api';
import {
  buildPlanRefFromPlan,
  buildSessionRunContext,
  createMockPlansService,
} from './plansService.mock';

// Re-export port types for backward compatibility - consumers should migrate
// to importing from '../../ports/plans' or '../../ports' directly.
export type { PlanPreviewInput } from '../../ports/plans';

/**
 * @deprecated Use {@link IPlansPort} from `../../ports/plans` instead.
 */
export type PlansService = IPlansPort;

export function createPlansService(
  mode: DataSourceMode,
  apiClient: ApiClient = createApiClient()
): IPlansPort {
  if (mode === 'api') {
    return createApiPlansService(apiClient);
  }

  return createMockPlansService();
}

export { buildSessionRunContext, buildPlanRefFromPlan };
