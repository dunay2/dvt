import type { IPlansPort } from '../../ports/plans';
import { type ApiClient, createApiClient } from '../api/createApiClient';
import type { DataSourceMode } from '../config/dataSource';
import { createApiPlansService } from './plansService.api';
import { createMockPlansService } from './plansService.mock';

export function createPlansService(
  mode: DataSourceMode,
  apiClient: ApiClient = createApiClient()
): IPlansPort {
  if (mode === 'api') {
    return createApiPlansService(apiClient);
  }

  return createMockPlansService();
}
