/** Confirm source freshness and preserve one idempotent graph-save acknowledgement. */
import { useState } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { WorkspaceGraphDraftSaveResponse, WorkspaceGraphDraftScope } from '@dvt/contracts';
import { queryKeys } from '../../queries/queryKeys';
import {
  useWorksheetCanvasModelQuery,
  useWorkspaceGraphDraftAuthoringPort,
} from '../../services/AppServicesContext';
import {
  WorksheetCanvasModelQueryError,
  type IWorksheetCanvasModelQueryPort,
  type WorksheetCanvasModelFailure,
} from '../../ports/worksheetCanvasModel';
import type { IWorkspaceGraphDraftAuthoringPort } from '../../ports/workspaceGraphDraftAuthoring';
import type {
  PreparedWorksheetCanvasProposal,
  WorksheetCanvasSnapshot,
} from './worksheetCanvasModelRequest';

export type WorksheetCanvasFailure = WorksheetCanvasModelFailure | 'invalid';
export type WorksheetCanvasReceipt = Readonly<{
  name: string;
  modelId: string;
  kind: WorkspaceGraphDraftSaveResponse['kind'] | 'unknown';
}>;
export type WorksheetCanvasOperation = Readonly<{
  phase: 'proposing' | 'saving' | null;
  run(phase: 'proposing' | 'saving', action: () => Promise<void>): Promise<void>;
  alive(): boolean;
}>;
export const worksheetCanvasFailure = (failure: unknown): WorksheetCanvasFailure =>
  failure instanceof WorksheetCanvasModelQueryError ? failure.reason : 'unavailable';

async function revalidateWorksheetProposal(
  query: IWorksheetCanvasModelQueryPort,
  prepared: PreparedWorksheetCanvasProposal,
  current: (snapshot: WorksheetCanvasSnapshot) => boolean
) {
  const checked = await query.propose({
    ...prepared.snapshot.request,
    verifyContextSha256: prepared.proposal.contextSha256,
  });
  if (checked.status !== 'current') throw new WorksheetCanvasModelQueryError('stale');
  if (checked.contextSha256 !== prepared.proposal.contextSha256)
    throw new WorksheetCanvasModelQueryError('stale');
  if (!current(prepared.snapshot)) throw new WorksheetCanvasModelQueryError('stale');
}

async function saveWorksheetProposal(
  authoring: IWorkspaceGraphDraftAuthoringPort,
  prepared: PreparedWorksheetCanvasProposal
): Promise<WorksheetCanvasReceipt['kind']> {
  const { proposal } = prepared;
  try {
    return (
      await authoring.saveGraphDraft({
        draft: proposal.draft,
        expectedRevision: proposal.expectedRevision,
        idempotencyKey: 'worksheet-canvas-model:' + proposal.proposalSha256,
      })
    ).kind;
  } catch {
    return 'unknown';
  }
}

function invalidateWorksheetDraft(cache: QueryClient, scope: WorkspaceGraphDraftScope) {
  const { tenantId, projectId, environmentId } = scope;
  void cache.invalidateQueries({
    queryKey: queryKeys.workspace
      .forLayout(`${tenantId}::${projectId}::${environmentId}`)
      .graphDraft(),
  });
}

export function useWorksheetCanvasPublication(
  operation: WorksheetCanvasOperation,
  current: (snapshot: WorksheetCanvasSnapshot) => boolean
) {
  const authoring = useWorkspaceGraphDraftAuthoringPort(),
    cache = useQueryClient(),
    query = useWorksheetCanvasModelQuery();
  const [receipt, setReceipt] = useState<WorksheetCanvasReceipt | null>(null),
    [error, setError] = useState<WorksheetCanvasFailure | null>(null);
  const confirm = (prepared: PreparedWorksheetCanvasProposal) =>
    operation.run('saving', async () => {
      setError(null);
      if (receipt?.kind !== 'unknown') {
        try {
          await revalidateWorksheetProposal(query, prepared, current);
        } catch (failure) {
          if (operation.alive()) setError(worksheetCanvasFailure(failure));
          return;
        }
      }
      const kind = await saveWorksheetProposal(authoring, prepared);
      if (kind === 'saved' || kind === 'conflict')
        invalidateWorksheetDraft(cache, prepared.proposal.scope);
      if (operation.alive())
        setReceipt({ kind, name: prepared.proposal.name, modelId: prepared.proposal.modelId });
    });
  return {
    receipt,
    confirm,
    error,
    clear: () => {
      setReceipt(null);
      setError(null);
    },
  };
}
