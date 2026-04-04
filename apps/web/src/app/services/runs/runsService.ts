import type { Run } from '../../types/dbt';
import type {
  EngineRunRef,
  PlanRef,
  RunContext,
  RunEventsResponse,
  RunStatusSnapshot,
} from '../../types/engine';
import { type ApiClient, createApiClient } from '../api/createApiClient';
import { resolveDataSource, type DataSourceMode } from '../config/dataSource';
import { createApiRunsService } from './runsService.api';
import { createMockRunsService } from './runsService.mock';

export type StartRunInput = {
  planRef: PlanRef;
  context: RunContext;
};

export interface RunsService {
  listRuns: () => Promise<Run[]>;
  getRun: (runId: string) => Promise<Run | null>;
  startRun: (input: StartRunInput) => Promise<EngineRunRef>;
  getRunStatus: (runId: string) => Promise<RunStatusSnapshot>;
  listRunEvents: (runId: string, afterSeq?: number) => Promise<RunEventsResponse>;
}

export function createRunsService(
  mode: DataSourceMode = resolveDataSource(),
  apiClient: ApiClient = createApiClient()
): RunsService {
  if (mode === 'api') {
    return createApiRunsService(apiClient);
  }

  return createMockRunsService();
}
