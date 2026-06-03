/** Owned concern: fold source-import outcomes into the draft graph and refresh route projections. */

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { ImportSourcesResult } from '../../ports/workspace';
import { queryKeys } from '../../queries/queryKeys';
import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import type {
  CanvasSourceImportContracts,
} from './canvasMutationHandlerContracts';

type UseCanvasSourceImportHandlersArgs = CanvasSourceImportContracts;

type UseCanvasSourceImportHandlersResult = {
  importedNodeFocusIds: string[];
  handleSourceImportComplete: (result: ImportSourcesResult) => void;
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
  const { setDraftSession, setSelectedNodes, setInspectorNode, showInspectorPanel, setCurrentPlan } =
    effects;
  const { canMutateGraph, workspaceLayoutKey } = policy;

  const queryClient = useQueryClient();
  const [importedNodeFocusIds, setImportedNodeFocusIds] = useState<string[]>([]);

  const handleSourceImportComplete = useCallback(
    (result: ImportSourcesResult) => {
      if (!canMutateGraph) {
        return;
      }

      const nextImportedNodeIds = result.importedNodeIds ?? [];
      setCurrentPlan(null);

      if (nextImportedNodeIds.length > 0) {
        setDraftSession((currentSession) =>
          canvasGraphLifecycle.node.queueImported(currentSession, nextImportedNodeIds)
        );
        setSelectedNodes(nextImportedNodeIds);
        setInspectorNode(nextImportedNodeIds[0] ?? null);
        showInspectorPanel();
        setImportedNodeFocusIds(nextImportedNodeIds);
      }

      requestAuthoritativeDraftRefresh(queryClient, workspaceLayoutKey);
    },
    [
      canMutateGraph,
      queryClient,
      setCurrentPlan,
      setDraftSession,
      setInspectorNode,
      setSelectedNodes,
      showInspectorPanel,
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
