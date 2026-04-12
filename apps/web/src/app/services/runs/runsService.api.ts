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
  RunAuthoringProvenance,
  MaterializationEvidence,
  RunExecutionEvidence,
  RunFailureEvidence,
  RunGitArtifactRef,
  RunProvenanceChain,
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

function asFiniteInteger(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value)) {
    return undefined;
  }

  return value;
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

function parseFailureEvidence(value: unknown): RunFailureEvidence | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const stepId = asString(candidate.stepId);
  const failedAt = asString(candidate.failedAt);
  const reason = asString(candidate.reason);
  const message = asString(candidate.message);

  if (!stepId || !failedAt) {
    return undefined;
  }

  return {
    stepId,
    failedAt,
    ...(reason ? { reason } : {}),
    ...(message ? { message } : {}),
  };
}

function parseExecutionEvidence(value: unknown): RunExecutionEvidence | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const activeStepId = asString(candidate.activeStepId);
  const failure = parseFailureEvidence(candidate.failure);
  const materialization = parseMaterializationEvidence(candidate.materialization);

  if (!activeStepId && !failure && !materialization) {
    return undefined;
  }

  return {
    ...(activeStepId ? { activeStepId } : {}),
    ...(failure ? { failure } : {}),
    ...(materialization ? { materialization } : {}),
  };
}

function parseGitArtifactRef(value: unknown): RunGitArtifactRef | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const repo = asString(candidate.repo);
  const path = asString(candidate.path);
  const ref = asString(candidate.ref);
  const commitSha = asString(candidate.commitSha);
  const contentSha256 = asString(candidate.contentSha256);

  if (!repo || !path) {
    return undefined;
  }

  return {
    repo,
    path,
    ...(ref ? { ref } : {}),
    ...(commitSha ? { commitSha } : {}),
    ...(contentSha256 ? { contentSha256 } : {}),
  };
}

function parseAuthoringProvenance(value: unknown): RunAuthoringProvenance | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const graphArtifact = parseGitArtifactRef(candidate.graphArtifact);
  const sqlArtifact = parseGitArtifactRef(candidate.sqlArtifact);

  if (!graphArtifact && !sqlArtifact) {
    return undefined;
  }

  return {
    ...(graphArtifact ? { graphArtifact } : {}),
    ...(sqlArtifact ? { sqlArtifact } : {}),
  };
}

function parseRunProvenance(value: unknown): RunProvenanceChain | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  const persistedPlan =
    candidate.persistedPlan && typeof candidate.persistedPlan === 'object'
      ? (candidate.persistedPlan as Record<string, unknown>)
      : null;

  const planRecordId = persistedPlan ? asString(persistedPlan.planRecordId) : undefined;
  const planVersion = persistedPlan ? asString(persistedPlan.planVersion) : undefined;
  const sourceRef = persistedPlan ? asString(persistedPlan.sourceRef) : undefined;
  const canonicalPlanSha256 = persistedPlan
    ? asString(persistedPlan.canonicalPlanSha256)
    : undefined;

  if (!planRecordId || !planVersion || !sourceRef || !canonicalPlanSha256) {
    return undefined;
  }

  const authoring = parseAuthoringProvenance(candidate.authoring);

  return {
    persistedPlan: {
      planRecordId,
      planVersion,
      sourceRef,
      canonicalPlanSha256,
    },
    ...(authoring ? { authoring } : {}),
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

  const currentStepId = asString(candidate.currentStepId);
  const failedStepId = asString(candidate.failedStepId);
  const errorReason = asString(candidate.errorReason);
  const materialization = parseMaterializationEvidence(candidate.materialization);

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
    ...(currentStepId ? { currentStepId } : {}),
    ...(failedStepId ? { failedStepId } : {}),
    ...(errorReason ? { errorReason } : {}),
    ...(materialization ? { materialization } : {}),
    provenance: parseRunProvenance(candidate.provenance),
    execution: parseExecutionEvidence(candidate.execution),
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
    execution: snapshot.execution,
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
    nextAfterSeq: asFiniteInteger(record.nextCursor),
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
