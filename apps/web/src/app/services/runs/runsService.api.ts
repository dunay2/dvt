import {
  parseEngineRunRef,
  parseRunEventRecord,
  type RunStatus as ContractRunStatus,
} from '@dvt/contracts';

import type { SessionContextPort } from '../../ports/sessionContext';
import type { RunEvent } from '../../types/engine';
import { ApiError, type ApiClient } from '../api/createApiClient';
import { createSessionContextPort } from '../session/sessionContextPort';
import type {
  MaterializationEvidence,
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

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseMaterializationEvidence(value: unknown): MaterializationEvidence | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const executor = asString(candidate.executor);
  const environmentId = asString(candidate.environmentId);
  const sinkTable = asString(candidate.sinkTable);
  const rowsWritten = asFiniteNumber(candidate.rowsWritten);
  const startedAt = asString(candidate.startedAt);
  const completedAt = asString(candidate.completedAt);
  const durationMs = asFiniteNumber(candidate.durationMs);

  if (
    (executor !== 'postgres' && executor !== 'dbt') ||
    !environmentId ||
    !sinkTable ||
    rowsWritten === undefined ||
    !startedAt ||
    !completedAt ||
    durationMs === undefined
  ) {
    return undefined;
  }

  return {
    executor,
    environmentId,
    sinkTable,
    rowsWritten,
    startedAt,
    completedAt,
    durationMs,
  };
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
    hash: asString(candidate.hash),
    snapshotStaleness: asString(candidate.snapshotStaleness) as
      | 'FRESH'
      | 'STALE'
      | 'UNKNOWN'
      | undefined,
    currentStepId: asString(candidate.currentStepId),
    failedStepId: asString(candidate.failedStepId),
    errorReason: asString(candidate.errorReason),
    materialization: parseMaterializationEvidence(candidate.materialization),
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
    currentStepId: snapshot.currentStepId,
    failedStepId: snapshot.failedStepId,
    errorReason: snapshot.errorReason,
    materialization: snapshot.materialization,
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

function buildTenantScopeQuery(
  sessionContext: SessionContextPort,
  includeWorkspaceScope: boolean
): string {
  const { tenantId, projectId, environmentId } = sessionContext.getWorkspaceScope();
  const query = new URLSearchParams({ tenantId });

  if (includeWorkspaceScope) {
    query.set('projectId', projectId);
    query.set('environmentId', environmentId);
  }

  return query.toString();
}

export function createApiRunsService(
  apiClient: ApiClient,
  sessionContext: SessionContextPort = createSessionContextPort()
): RunsService {
  async function getRunSnapshotById(runId: string): Promise<RunSnapshot | null> {
    try {
      const scopeQuery = buildTenantScopeQuery(sessionContext, false);
      const payload = await apiClient.getJson<unknown>(`/runs/${runId}?${scopeQuery}`);
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
      const scopeQuery = buildTenantScopeQuery(sessionContext, true);
      const payload = await apiClient.getJson<unknown>(`/runs?${scopeQuery}`);
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
      const query = new URLSearchParams(buildTenantScopeQuery(sessionContext, false));
      if (afterSeq !== undefined) {
        query.set('afterSeq', String(afterSeq));
      }
      const payload = await apiClient.getJson<unknown>(`/runs/${runId}/events?${query.toString()}`);
      const normalized = extractEventsPayload(payload);
      return {
        events: normalized.events.map((event) => parseRunEventRecord(event)) as RunEvent[],
        nextAfterSeq: normalized.nextAfterSeq,
      };
    },
  };
}
