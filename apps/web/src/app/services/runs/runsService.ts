import type { IRunsPort } from '../../ports/runs';
import { type ApiClient, createApiClient } from '../api/createApiClient';
import type { DataSourceMode } from '../config/dataSource';
import { createApiRunsService } from './runsService.api';
import { createMockRunsService } from './runsService.mock';

// Re-export port types for backward compatibility — consumers should migrate
// to importing from '../../ports/runs' or '../../ports' directly.
export type {
  StartRunInput,
  UiRunStatus,
  RunSummaryItem,
  RunSnapshot,
  RunEventTimelinePage,
} from '../../ports/runs';

/**
 * @deprecated Use {@link IRunsPort} from `../../ports/runs` instead.
 */
export type RunsService = IRunsPort;

export function createRunsService(
  mode: DataSourceMode,
  apiClient: ApiClient = createApiClient()
): IRunsPort {
  if (mode === 'api') {
    return createApiRunsService(apiClient);
  }

  return createMockRunsService();
}
