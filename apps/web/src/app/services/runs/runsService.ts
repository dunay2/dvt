/**
 * Owned concern: compose the active runs-port adapter for the configured data
 * source mode without changing the runs port contract.
 */
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import { type ApiClient, createApiClient } from '../api/createApiClient';
import type { DataSourceMode } from '../config/dataSource';
import { createApiRunsService } from './runsService.api';
import { createMockRunsService } from './runsService.mock';

export interface RunsServiceDependencies {
  sessionContext?: SessionContextPort;
}

export function createRunsService(
  mode: DataSourceMode,
  apiClient: ApiClient = createApiClient(),
  dependencies: RunsServiceDependencies = {}
): IRunsPort {
  if (mode === 'api') {
    return createApiRunsService(apiClient, dependencies.sessionContext);
  }

  return createMockRunsService(dependencies.sessionContext);
}
