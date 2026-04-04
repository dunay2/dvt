import {
  parseEngineRunRef,
  parseRunEventRecord,
  parseRunStatusSnapshot,
  type RunStatus as ContractRunStatus,
} from '@dvt/contracts';

import type { Run } from '../../types/dbt';
import type { RunEvent, RunEventsResponse, RunStatusSnapshot } from '../../types/engine';
import { ApiError, type ApiClient } from '../api/createApiClient';
import type { RunsService, StartRunInput } from './runsService';

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

export function createApiRunsService(apiClient: ApiClient): RunsService {
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
    startRun: async (input: StartRunInput) => {
      const payload = await apiClient.postJson<StartRunInput, unknown>('/runs', input);
      return parseEngineRunRef(payload);
    },
    getRunStatus: async (runId): Promise<RunStatusSnapshot> => {
      const payload = await apiClient.getJson<unknown>(`/runs/${runId}/status`);
      return parseRunStatusSnapshot(payload) as RunStatusSnapshot;
    },
    listRunEvents: async (runId, afterSeq): Promise<RunEventsResponse> => {
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
