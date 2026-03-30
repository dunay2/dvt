import {
  parseEngineRunRef,
  parseRunEventRecord,
  parseRunStatusSnapshot,
  type RunStatus as ContractRunStatus,
} from '@dvt/contracts';

import { mockRun } from '../../data/mockDbtData';
import { useSessionStore } from '../../stores/sessionStore';
import type { Run, RunEvent as DbtRunEvent } from '../../types/dbt';
import type {
  EngineRunRef,
  PlanRef,
  RunContext,
  RunEvent,
  RunEventsResponse,
  RunStatusSnapshot,
} from '../../types/engine';
import { ApiError, type ApiClient, createApiClient } from '../api/createApiClient';
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

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function isDbtRunShape(value: unknown): value is Run {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<Run>;
  return (
    typeof candidate.runId === 'string' &&
    typeof candidate.planId === 'string' &&
    typeof candidate.environment === 'string' &&
    typeof candidate.gitSha === 'string' &&
    typeof candidate.startTime === 'string' &&
    Array.isArray(candidate.steps) &&
    Array.isArray(candidate.events)
  );
}

function mapContractStatusToUi(status: ContractRunStatus | string | undefined): Run['status'] {
  switch ((status ?? '').toUpperCase()) {
    case 'APPROVED':
    case 'PENDING':
      return 'pending';
    case 'RUNNING':
    case 'PAUSED':
      return 'running';
    case 'COMPLETED':
      return 'completed';
    case 'FAILED':
      return 'failed';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function mapContractRecordToUiRun(record: unknown): Run | null {
  if (isDbtRunShape(record)) {
    return record;
  }

  if (!record || typeof record !== 'object') {
    return null;
  }

  const candidate = record as Record<string, unknown>;
  const runId = asString(candidate.runId);
  if (!runId) {
    return null;
  }

  return {
    runId,
    planId: asString(candidate.planId) ?? 'unknown-plan',
    status: mapContractStatusToUi(asString(candidate.status)),
    environment: asString(candidate.environmentId) ?? asString(candidate.environment) ?? 'unknown',
    gitSha: asString(candidate.gitSha) ?? 'unknown',
    startTime:
      asString(candidate.startedAt) ??
      asString(candidate.createdAt) ??
      asString(candidate.startTime) ??
      new Date().toISOString(),
    events: [],
    steps: [],
  };
}

function extractRunListPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (
    payload &&
    typeof payload === 'object' &&
    'runs' in payload &&
    Array.isArray((payload as { runs?: unknown[] }).runs)
  ) {
    return (payload as { runs: unknown[] }).runs;
  }
  return [];
}

function extractEventsPayload(payload: unknown): { events: unknown[]; nextAfterSeq?: number } {
  if (Array.isArray(payload)) {
    return { events: payload };
  }

  if (payload && typeof payload === 'object') {
    const record = payload as { events?: unknown[]; nextAfterSeq?: unknown };
    if (Array.isArray(record.events)) {
      return {
        events: record.events,
        nextAfterSeq: typeof record.nextAfterSeq === 'number' ? record.nextAfterSeq : undefined,
      };
    }
  }

  return { events: [] };
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
    listRunEvents: async (runId) => {
      const { tenantId, projectId, environmentId } = useSessionStore.getState();
      return {
        events: mockRun.events.map((event, index) => {
          return {
            eventId: event.id,
            eventType: mapMockEventType(event.type),
            runId,
            emittedAt: event.timestamp,
            tenantId,
            projectId,
            environmentId,
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
          };
        }),
      };
    },
  };
}

function createApiRunsService(apiClient: ApiClient): RunsService {
  return {
    listRuns: async () => {
      const payload = await apiClient.getJson<unknown>('/runs');
      return extractRunListPayload(payload)
        .map(mapContractRecordToUiRun)
        .filter((run): run is Run => run !== null);
    },
    getRun: async (runId) => {
      try {
        const payload = await apiClient.getJson<unknown>(`/runs/${runId}`);
        return mapContractRecordToUiRun(payload);
      } catch (error) {
        if (error instanceof ApiError && error.statusCode === 404) {
          return null;
        }
        throw error;
      }
    },
    startRun: async (input) => {
      const payload = await apiClient.postJson<StartRunInput, unknown>('/runs', input);
      return parseEngineRunRef(payload);
    },
    getRunStatus: async (runId) => {
      const payload = await apiClient.getJson<unknown>(`/runs/${runId}/status`);
      return parseRunStatusSnapshot(payload) as RunStatusSnapshot;
    },
    listRunEvents: async (runId, afterSeq) => {
      const query = afterSeq === undefined ? '' : `?after=${afterSeq}`;
      const payload = await apiClient.getJson<unknown>(`/runs/${runId}/events${query}`);
      const normalized = extractEventsPayload(payload);
      return {
        events: normalized.events.map((event) => parseRunEventRecord(event)) as RunEvent[],
        nextAfterSeq: normalized.nextAfterSeq,
      };
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
