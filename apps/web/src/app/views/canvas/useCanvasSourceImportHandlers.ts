/** Owned concern: fold source-import outcomes into the draft graph and refresh route projections. */

import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { ImportSourcesResult } from '../../ports/workspace';
import { queryKeys } from '../../queries/queryKeys';
import { canvasGraphLifecycle } from './canvasGraphLifecycle';
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

const IMPORTED_SOURCE_NODE_HORIZONTAL_GAP = 240;

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

function buildContextualSourceImportNodePositions(
  currentNodes: ReadonlyArray<{ id: string; position: { x: number; y: number } }>,
  importedNodeIds: readonly string[],
  context: CanvasSourceImportCompletionContext | undefined
): Record<string, { x: number; y: number }> | null {
  if (context == null || importedNodeIds.length === 0) {
    return null;
  }

  const existingPositions = Object.fromEntries(
    currentNodes.map((node) => [node.id, { x: node.position.x, y: node.position.y }])
  );
  const importedPositions = Object.fromEntries(
    importedNodeIds.map((nodeId, index) => [
      nodeId,
      {
        x: context.canvasPosition.x + IMPORTED_SOURCE_NODE_HORIZONTAL_GAP * index,
        y: context.canvasPosition.y,
      },
    ])
  );

  return {
    ...existingPositions,
    ...importedPositions,
  };
}

export function useCanvasSourceImportHandlers({
  state,
  effects,
  policy,
}: UseCanvasSourceImportHandlersArgs): UseCanvasSourceImportHandlersResult {
  const { graphModel } = state;
  const { setDraftSession, setSelectedNodes, setInspectorNode, setCurrentPlan, onLayoutComplete } =
    effects;
  const { canMutateGraph, workspaceLayoutKey } = policy;

  const queryClient = useQueryClient();
  const [importedNodeFocusIds, setImportedNodeFocusIds] = useState<string[]>([]);

  const handleSourceImportComplete = useCallback(
    (result: ImportSourcesResult, context?: CanvasSourceImportCompletionContext) => {
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
        setImportedNodeFocusIds(nextImportedNodeIds);
        const contextualPositions = buildContextualSourceImportNodePositions(
          graphModel.nodes,
          nextImportedNodeIds,
          context
        );
        if (contextualPositions != null) {
          onLayoutComplete(contextualPositions);
        }
      }

      requestAuthoritativeDraftRefresh(queryClient, workspaceLayoutKey);
    },
    [
      canMutateGraph,
      graphModel.nodes,
      onLayoutComplete,
      queryClient,
      setCurrentPlan,
      setDraftSession,
      setInspectorNode,
      setSelectedNodes,
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
