import { mockRun } from '../../data/mockDbtData';
import type { Run, RunEvent as DbtRunEvent } from '../../types/dbt';
import type {
  EngineRunRef,
  PlanRef,
  RunContext,
  RunEvent,
  RunEventsResponse,
  RunStatusSnapshot,
} from '../../types/engine';
import { type ApiClient, createApiClient } from '../api/createApiClient';
import { resolveDataSource, type DataSourceMode } from '../config/dataSource';

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

function buildMockRunList(): Run[] {
  const completedRun: Run = {
    ...mockRun,
    runId: 'run_abc123',
    status: 'completed',
  };

  return [mockRun, completedRun];
}

function mapMockEventType(eventType: DbtRunEvent['type']): RunEvent['eventType'] {
  switch (eventType) {
    case 'NodeStarted':
      return 'StepStarted';
    case 'NodeCompleted':
      return 'StepCompleted';
    case 'NodeFailed':
      return 'StepFailed';
    default:
      return eventType;
  }
}

function createMockRunsService(): RunsService {
  return {
    listRuns: async () => buildMockRunList(),
    getRun: async (runId) => buildMockRunList().find((run) => run.runId === runId) ?? null,
    startRun: async (input) => {
      const base = {
        tenantId: input.context.tenantId,
        workflowId: `wf_${input.context.runId}`,
        runId: input.context.runId,
      };

      if (input.context.targetAdapter === 'temporal') {
        return {
          provider: 'temporal',
          namespace: 'default',
          ...base,
        };
      }

      if (input.context.targetAdapter === 'conductor') {
        return {
          provider: 'conductor',
          conductorUrl: 'http://localhost:8080',
          ...base,
        };
      }

      return {
        provider: 'mock',
        ...base,
      };
    },
    getRunStatus: async (runId) => ({
      runId,
      status: 'RUNNING',
      message: 'Mock run status',
      startedAt: mockRun.startTime,
    }),
    listRunEvents: async (runId) => ({
      events: mockRun.events.map((event, index) => ({
        eventId: event.id,
        eventType: mapMockEventType(event.type),
        runId,
        emittedAt: event.timestamp,
        tenantId: 'acme-corp',
        projectId: 'dbt-analytics',
        environmentId: 'dev',
        planId: mockRun.planId,
        planVersion: '1.0.0',
        engineAttemptId: 1,
        logicalAttemptId: 1,
        idempotencyKey: `${runId}-${event.id}`,
        payloadVersion: 1,
        stepId: event.stepId ?? 'step_runtime',
        payload: event.nodeId
          ? {
              nodeId: event.nodeId,
              originalEventType: event.type,
            }
          : undefined,
        runSeq: index + 1,
        persistedAt: event.timestamp,
      })),
    }),
  };
}

function createApiRunsService(apiClient: ApiClient): RunsService {
  return {
    listRuns: () => apiClient.getJson<Run[]>('/runs'),
    getRun: (runId) => apiClient.getJson<Run>(`/runs/${runId}`),
    startRun: (input) => apiClient.postJson<StartRunInput, EngineRunRef>('/runs', input),
    getRunStatus: (runId) => apiClient.getJson<RunStatusSnapshot>(`/runs/${runId}/status`),
    listRunEvents: (runId, afterSeq) => {
      const query = afterSeq === undefined ? '' : `?after=${afterSeq}`;
      return apiClient.getJson<RunEventsResponse>(`/runs/${runId}/events${query}`);
    },
  };
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
