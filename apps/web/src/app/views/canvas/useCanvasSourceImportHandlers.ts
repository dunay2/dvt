import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../../queries/queryKeys';
import { queueExplicitNodeIds } from './canvasDraftSession';
import type {
  CanvasSourceImportHandlers,
  UseCanvasMutationHandlersArgs,
} from './canvasMutationHandlers.types';

type UseCanvasSourceImportHandlersArgs = Pick<
  UseCanvasMutationHandlersArgs,
  | 'canMutateGraph'
  | 'workspaceLayoutKey'
  | 'setDraftSession'
  | 'setSelectedNodes'
  | 'setInspectorNode'
  | 'showInspectorPanel'
  | 'setCurrentPlan'
>;

function requestWorkspaceGraphRefresh(
  queryClient: { invalidateQueries: (args: { queryKey: readonly unknown[] }) => Promise<unknown> },
  workspaceLayoutKey: string
) {
  queryClient
    .invalidateQueries({
      queryKey: queryKeys.workspace.graph(workspaceLayoutKey),
    })
    .catch(() => undefined);
}

export function useCanvasSourceImportHandlers({
  canMutateGraph,
  workspaceLayoutKey,
  setDraftSession,
  setSelectedNodes,
  setInspectorNode,
  showInspectorPanel,
  setCurrentPlan,
}: UseCanvasSourceImportHandlersArgs): CanvasSourceImportHandlers {
  const queryClient = useQueryClient();
  const [importedNodeFocusIds, setImportedNodeFocusIds] = useState<string[]>([]);

  const handleSourceImportComplete = useCallback(
    (result: Parameters<CanvasSourceImportHandlers['handleSourceImportComplete']>[0]) => {
      if (!canMutateGraph) {
        return;
      }

      const nextImportedNodeIds = result.importedNodeIds ?? [];
      setCurrentPlan(null);

      if (nextImportedNodeIds.length > 0) {
        setDraftSession((currentSession) =>
          queueExplicitNodeIds(currentSession, nextImportedNodeIds)
        );
        setSelectedNodes(nextImportedNodeIds);
        setInspectorNode(nextImportedNodeIds[0] ?? null);
        showInspectorPanel();
        setImportedNodeFocusIds(nextImportedNodeIds);
      }

      requestWorkspaceGraphRefresh(queryClient, workspaceLayoutKey);
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
