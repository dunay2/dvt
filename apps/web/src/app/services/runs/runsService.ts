import {
  parseEngineRunRef,
  parseRunEventRecord,
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
} from '../../types/engine';
import { ApiError, type ApiClient, createApiClient } from '../api/createApiClient';
import { resolveDataSource, type DataSourceMode } from '../config/dataSource';

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

function mapContractStatusToUi(status: ContractRunStatus | string | undefined): UiRunStatus {
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

function mapDbtRunToSnapshot(run: Run): RunSnapshot {
  return {
    runId: run.runId,
    planId: run.planId,
    status: run.status,
    environment: run.environment,
    gitSha: run.gitSha,
    startedAt: run.startTime,
    completedAt: run.endTime,
  };
}

function mapUnknownRecordToSnapshot(record: unknown): RunSnapshot | null {
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
    planId: asString(candidate.planId),
    status: mapContractStatusToUi(asString(candidate.status)),
    environment: asString(candidate.environmentId) ?? asString(candidate.environment),
    gitSha: asString(candidate.gitSha),
    startedAt:
      asString(candidate.startedAt) ??
      asString(candidate.createdAt) ??
      asString(candidate.startTime) ??
      new Date().toISOString(),
    completedAt: asString(candidate.completedAt) ?? asString(candidate.endTime),
    substatus: asString(candidate.substatus),
    message: asString(candidate.message),
    hash: asString(candidate.hash),
    snapshotStaleness: asString(candidate.snapshotStaleness) as
      | 'FRESH'
      | 'STALE'
      | 'UNKNOWN'
      | undefined,
  };
}

function mapSnapshotToSummary(snapshot: RunSnapshot): RunSummaryItem {
  return {
    runId: snapshot.runId,
    planId: snapshot.planId,
    status: snapshot.status,
    environment: snapshot.environment,
    gitSha: snapshot.gitSha,
    startedAt: snapshot.startedAt,
    completedAt: snapshot.completedAt,
    substatus: snapshot.substatus,
    message: snapshot.message,
    hash: snapshot.hash,
    snapshotStaleness: snapshot.snapshotStaleness,
  };
}

function extractRunListPayload(payload: unknown): unknown[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as { items?: unknown[] };
  return Array.isArray(record.items) ? record.items : [];
}

function extractEventsPayload(payload: unknown): { events: unknown[]; nextAfterSeq?: number } {
  if (!payload || typeof payload !== 'object') {
    return { events: [] };
  }

  const record = payload as { items?: unknown[]; nextCursor?: unknown };
  return {
    events: Array.isArray(record.items) ? record.items : [],
    nextAfterSeq: typeof record.nextCursor === 'number' ? record.nextCursor : undefined,
  };
}

function createMockRunsService(): RunsService {
  return {
    listRunSummaries: async () => buildMockRunList().map(mapDbtRunToSnapshot).map(mapSnapshotToSummary),
    getRunSnapshot: async (runId) => {
      const run = buildMockRunList().find((candidate) => candidate.runId === runId) ?? null;
      return run ? mapDbtRunToSnapshot(run) : null;
    },
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
  async function getRunSnapshotById(runId: string): Promise<RunSnapshot | null> {
    try {
      const payload = await apiClient.getJson<unknown>(`/runs/${runId}`);
      return mapUnknownRecordToSnapshot(payload);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  return {
    listRunSummaries: async () => {
      const payload = await apiClient.getJson<unknown>('/runs');
      return extractRunListPayload(payload)
        .map(mapUnknownRecordToSnapshot)
        .filter((snapshot): snapshot is RunSnapshot => snapshot !== null)
        .map(mapSnapshotToSummary);
    },
    getRunSnapshot: getRunSnapshotById,
    startRun: async (input) => {
      const payload = await apiClient.postJson<StartRunInput, unknown>('/runs/start', input);
      return parseEngineRunRef(payload);
    },
    listRunEvents: async (runId, afterSeq) => {
      const query = afterSeq === undefined ? '' : `?afterSeq=${afterSeq}`;
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
