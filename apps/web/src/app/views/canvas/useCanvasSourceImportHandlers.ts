/**
 * Owned concern: adopt source registration receipts and refresh the authoritative catalogue.
 * @baseline GH-3610: only an explicit drop admits a registered source to the visible graph.
 * @decision Keep import focus in the explorer; do not queue placement or change coordinates.
 * @consequence Import cannot alter graph selection, topology or viewport.
 * @version 1.0.0
 */

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { ImportSourcesResult } from '../../ports/workspace';
import { queryKeys } from '../../queries/queryKeys';
import { canvasDraftSession } from './canvasDraftSession';
import type {
  CanvasSourceImportCompletionContext,
  CanvasSourceImportContracts,
} from './canvasMutationHandlerContracts';

type UseCanvasSourceImportHandlersArgs = CanvasSourceImportContracts;

type UseCanvasSourceImportHandlersResult = {
  importedNodeFocusIds: string[];
  handleSourceImportComplete: (
    result: ImportSourcesResult,
    context?: CanvasSourceImportCompletionContext
  ) => void;
  handleImportedNodeFocusComplete: () => void;
};

function requestAuthoritativeDraftRefresh(
  queryClient: { invalidateQueries: (args: { queryKey: readonly unknown[] }) => Promise<unknown> },
  workspaceLayoutKey: string
) {
  queryClient
    .invalidateQueries({
      queryKey: queryKeys.workspace.graphDraft(workspaceLayoutKey),
    })
    .catch(() => undefined);
}

export function useCanvasSourceImportHandlers({
  effects,
  policy,
}: UseCanvasSourceImportHandlersArgs): UseCanvasSourceImportHandlersResult {
  const { setDraftSession, setCurrentPlan, invalidateInFlightSaveAttempt } = effects;
  const { canMutateGraph, workspaceLayoutKey } = policy;

  const queryClient = useQueryClient();
  const [importedNodeFocusIds, setImportedNodeFocusIds] = useState<string[]>([]);

  const handleSourceImportComplete = useCallback(
    (result: ImportSourcesResult) => {
      const outcome = result.outcome;
      if (!canMutateGraph || outcome.kind !== 'graph-draft') {
        return;
      }

      const nextImportedNodeIds = outcome.importedNodeIds;
      setCurrentPlan(null);
      invalidateInFlightSaveAttempt();

      setDraftSession((currentSession) =>
        canvasDraftSession.machine.adoptExternalRevision(currentSession, outcome.draftRevision)
      );
      setImportedNodeFocusIds(nextImportedNodeIds);

      requestAuthoritativeDraftRefresh(queryClient, workspaceLayoutKey);
    },
    [
      canMutateGraph,
      invalidateInFlightSaveAttempt,
      queryClient,
      setCurrentPlan,
      setDraftSession,
      workspaceLayoutKey,
    ]
  );

  const handleImportedNodeFocusComplete = useCallback(() => {
    setImportedNodeFocusIds([]);
  }, []);

  return {
    importedNodeFocusIds,
    handleSourceImportComplete,
    handleImportedNodeFocusComplete,
  };
}
