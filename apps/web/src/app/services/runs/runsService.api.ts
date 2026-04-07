import {
  parseEngineRunRef,
  parseRunEventRecord,
  type RunStatus as ContractRunStatus,
} from '@dvt/contracts';

import type { RunEvent } from '../../types/engine';
import { ApiError, type ApiClient } from '../api/createApiClient';
import type {
  RunEventTimelinePage,
  RunSnapshot,
  RunSummaryItem,
  RunsService,
  StartRunInput,
  UiRunStatus,
} from './runsService';

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

export function createApiRunsService(apiClient: ApiClient): RunsService {
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
    startRun: async (input: StartRunInput) => {
      const payload = await apiClient.postJson<StartRunInput, unknown>('/runs/start', input);
      return parseEngineRunRef(payload);
    },
    listRunEvents: async (runId, afterSeq): Promise<RunEventTimelinePage> => {
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
