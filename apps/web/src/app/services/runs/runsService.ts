import type { EngineRunRef, PlanRef, RunContext, RunEvent } from '../../types/engine';
import { type ApiClient, createApiClient } from '../api/createApiClient';
import { resolveDataSource, type DataSourceMode } from '../config/dataSource';
import { createApiRunsService } from './runsService.api';
import { createMockRunsService } from './runsService.mock';

export type StartRunInput = {
  planRef: PlanRef;
  context: RunContext;
};

export type UiRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type RunSummaryItem = {
  runId: string;
  planId?: string;
  status: UiRunStatus;
  environment?: string;
  gitSha?: string;
  startedAt: string;
  completedAt?: string;
  substatus?: string;
  message?: string;
  hash?: string;
  snapshotStaleness?: 'FRESH' | 'STALE' | 'UNKNOWN';
};

export type RunSnapshot = {
  runId: string;
  planId?: string;
  status: UiRunStatus;
  environment?: string;
  gitSha?: string;
  startedAt: string;
  completedAt?: string;
  substatus?: string;
  message?: string;
  hash?: string;
  snapshotStaleness?: 'FRESH' | 'STALE' | 'UNKNOWN';
};

export type RunEventTimelinePage = {
  events: RunEvent[];
  nextAfterSeq?: number;
};

export interface RunsService {
  listRunSummaries: () => Promise<RunSummaryItem[]>;
  getRunSnapshot: (runId: string) => Promise<RunSnapshot | null>;
  startRun: (input: StartRunInput) => Promise<EngineRunRef>;
  listRunEvents: (runId: string, afterSeq?: number) => Promise<RunEventTimelinePage>;
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
