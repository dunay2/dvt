/**
 * Owned concern: adapt the presentation runs port to the protected HTTP API
 * while keeping platform-owned run identity out of client requests.
 */
import type { ExecutionSelection } from '@dvt/contracts';
import { parseRunEventRecord, SourceDataSampleResponseSchema } from '@dvt/contracts';

import type {
  IRunsPort,
  RunEventTimelinePage,
  RunSnapshot,
  RunStartReceipt,
  StartRunInput,
} from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { RunEvent } from '../../types/engine';
import { ApiError, type ApiClient } from '../api/createApiClient';
import { normalizeProtectedRuntimeRejection } from '../api/protectedRuntimeRejection';
import { createBrowserIdempotencyKey } from '../idempotency/createBrowserIdempotencyKey';
import { createSessionContextPort } from '../session/sessionContextPort';
import { parseCancelRunReceipt, parseRecoverRunReceipt } from '@dvt/contracts';
import type { RecoveryIdempotencyKeyStore } from './recoveryIdempotencyKeyStore';
import {
  extractEventsPayload,
  extractRunListPayload,
  buildTenantScopeQuery,
} from './runsApiPayloads';
import { mapSnapshotToSummary, mapUnknownRecordToSnapshot } from './runsApiSnapshotMapper';

type StartRunApiRequest = {
  readonly tenantId: string;
  readonly projectId: string;
  readonly environmentId: string;
  readonly targetAdapter: StartRunInput['workspaceScope']['targetAdapter'];
  readonly selection: ExecutionSelection;
  readonly planRef: StartRunInput['planRef'];
};

function parseRunStartReceipt(input: unknown): RunStartReceipt {
  if (typeof input !== 'object' || input === null) {
    throw new Error('RUN_START_RESPONSE_INVALID');
  }

  const candidate = input as {
    runId?: unknown;
    accepted?: unknown;
    duplicate?: unknown;
    duplicateOf?: unknown;
  };

  if (typeof candidate.runId !== 'string' || candidate.runId.trim().length === 0) {
    throw new Error('RUN_START_RESPONSE_INVALID_RUN_ID');
  }

  if (typeof candidate.accepted !== 'boolean') {
    throw new Error('RUN_START_RESPONSE_INVALID_ACCEPTED');
  }

  if (candidate.duplicate !== undefined && typeof candidate.duplicate !== 'boolean') {
    throw new Error('RUN_START_RESPONSE_INVALID_DUPLICATE');
  }

  if (
    candidate.duplicateOf !== undefined &&
    (typeof candidate.duplicateOf !== 'string' || candidate.duplicateOf.trim().length === 0)
  ) {
    throw new Error('RUN_START_RESPONSE_INVALID_DUPLICATE_OF');
  }

  return {
    runId: candidate.runId,
    accepted: candidate.accepted,
    ...(candidate.duplicate === undefined ? {} : { duplicate: candidate.duplicate }),
    ...(candidate.duplicateOf === undefined ? {} : { duplicateOf: candidate.duplicateOf }),
  };
}

export function createApiRunsService(
  apiClient: ApiClient,
  sessionContext: SessionContextPort = createSessionContextPort(),
  recoveryIdempotencyKeyStore: RecoveryIdempotencyKeyStore
): IRunsPort {
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
    getRunMaterializationSample: async (runId, limit) => {
      const scopeQuery = new URLSearchParams(buildTenantScopeQuery(sessionContext, false));
      scopeQuery.set('limit', String(limit));
      return SourceDataSampleResponseSchema.parse(
        await apiClient.getJson<unknown>(
          `/runs/${runId}/materialization-rows?${scopeQuery.toString()}`
        )
      );
    },
    cancelRun: async (runId) => {
      const { tenantId } = sessionContext.getWorkspaceScope();
      try {
        const payload = await apiClient.postJson<{ tenantId: string }, unknown>(
          `/runs/${runId}/cancel`,
          { tenantId }
        );
        return parseCancelRunReceipt(payload);
      } catch (error) {
        throw normalizeProtectedRuntimeRejection(error) ?? error;
      }
    },
    recoverRun: async (runId) => {
      const { tenantId } = sessionContext.getWorkspaceScope();
      const recoveryIdentity = { tenantId, runId };
      const idempotencyKey =
        recoveryIdempotencyKeyStore.get(recoveryIdentity) ??
        createBrowserIdempotencyKey('recover-run');
      recoveryIdempotencyKeyStore.set(recoveryIdentity, idempotencyKey);
      try {
        const payload = await apiClient.postJson<{ tenantId: string }, unknown>(
          `/runs/${runId}/recover`,
          { tenantId },
          { headers: { 'Idempotency-Key': idempotencyKey } }
        );
        const receipt = parseRecoverRunReceipt(payload);
        recoveryIdempotencyKeyStore.delete(recoveryIdentity);
        return receipt;
      } catch (error) {
        const rejection = normalizeProtectedRuntimeRejection(error);
        if (rejection !== null) recoveryIdempotencyKeyStore.delete(recoveryIdentity);
        throw rejection ?? error;
      }
    },
    startRun: async (input: StartRunInput) => {
      try {
        const payload = await apiClient.postJson<StartRunApiRequest, unknown>('/runs/start', {
          tenantId: input.workspaceScope.tenantId,
          projectId: input.workspaceScope.projectId,
          environmentId: input.workspaceScope.environmentId,
          targetAdapter: input.workspaceScope.targetAdapter,
          selection: input.selection,
          planRef: input.planRef,
        });
        return parseRunStartReceipt(payload);
      } catch (error) {
        throw normalizeProtectedRuntimeRejection(error) ?? error;
      }
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
