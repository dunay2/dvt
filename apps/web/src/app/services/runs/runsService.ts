import type { IRunsPort } from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import { type ApiClient, createApiClient } from '../api/createApiClient';
import type { DataSourceMode } from '../config/dataSource';
import { createApiRunsService } from './runsService.api';
import { createMockRunsService } from './runsService.mock';

// Re-export port types for backward compatibility — consumers should migrate
// to importing from '../../ports/runs' or '../../ports' directly.
export type {
  MaterializationEvidence,
  RunAuthoringProvenance,
  RunExecutionEvidence,
  RunFailureEvidence,
  RunGitArtifactRef,
  RunPersistedPlanProvenance,
  RunProvenanceChain,
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
