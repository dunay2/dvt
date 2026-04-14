import {
  parseEngineRunRef,
  parseRunEventRecord,
} from '@dvt/contracts';

import type {
  IRunsPort,
  RunEventTimelinePage,
  RunSnapshot,
  StartRunInput,
} from '../../ports/runs';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { RunEvent } from '../../types/engine';
import { ApiError, type ApiClient } from '../api/createApiClient';
import { createSessionContextPort } from '../session/sessionContextPort';
import { extractEventsPayload, extractRunListPayload, buildTenantScopeQuery } from './runsApiPayloads';
import { mapSnapshotToSummary, mapUnknownRecordToSnapshot } from './runsApiSnapshotMapper';

export function createApiRunsService(
  apiClient: ApiClient,
  sessionContext: SessionContextPort = createSessionContextPort()
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
