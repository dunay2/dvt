/**
 * Owned concern: compose the API runs-port adapter for the web composition
 * root without changing the presentation-facing runs port contract.
 */
import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import { type ApiClient, createApiClient } from '../api/createApiClient';
import { createApiRunsService } from './runsService.api';

export interface RunsServiceDependencies {
  sessionContext?: SessionContextPort;
}

export function createRunsService(
  apiClient: ApiClient = createApiClient(),
  dependencies: RunsServiceDependencies = {}
): IRunsPort {
  return createApiRunsService(apiClient, dependencies.sessionContext);
}
