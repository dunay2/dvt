/** Owned concern: remove nodes through lifecycle semantics and apply coupled route fallout once. */

import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import type { CanvasNodeRemovalContracts } from './canvasGraphHandlerContracts';
import { applyCanvasGraphLifecycleFallout } from './canvasGraphLifecycleFallout';
import { canvasViewCopy, formatCanvasNodeRemovedMessage } from './copy';
import type { CanvasDraftSessionCommandRunner } from './useCanvasWorkspaceDraftSession';
import { resolveCanvasExplorerCopy } from './explorer/canvasExplorerCopy';
import { getApplicationLanguage } from '../../stores/applicationLanguageStore';

type UseCanvasNodeRemovalHandlersArgs = CanvasNodeRemovalContracts;

type UseCanvasNodeRemovalHandlersResult = {
  handleRemoveNode: (nodeId: string, intent?: 'placement' | 'empty-definition') => void;
};

function usePendingCanvasRemovals(
  runDraftSessionCommand: CanvasDraftSessionCommandRunner,
  canEditEdges: boolean
): { current: Set<ReturnType<typeof setTimeout>> } {
  const pendingRemovals = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const pending = pendingRemovals.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, [runDraftSessionCommand, canEditEdges]);
  return pendingRemovals;
}

function useCanvasNodeRemovalCommit(
  effects: CanvasNodeRemovalContracts['effects'],
  viewState: { current: CanvasNodeRemovalContracts['state'] },
  runDraftSessionCommand: CanvasDraftSessionCommandRunner
): NonNullable<UseCanvasNodeRemovalHandlersResult['handleRemoveNode']> {
  const {
    setNodes,
    setEdges,
    setDraftSession,
    reconcileSelectionAfterNodeRemoval,
    setInspectorNode,
  } = effects;
  return useCallback(
    (nodeId: string, intent: 'placement' | 'empty-definition' = 'placement') => {
      const command = runDraftSessionCommand((draftSession) => {
        const currentState = { ...viewState.current, draftSession };
        const result = canvasGraphLifecycle.node.remove(currentState, nodeId, intent);
        if (result.outcome !== 'removed') return { outcome: 'rejected' as const, result };
        return {
          outcome: 'applied' as const,
          draftSession: result.state.draftSession,
          result,
          currentState,
        };
      });
      const removeResult = command.result;
      if (command.outcome !== 'applied' || removeResult.outcome !== 'removed') {
        if (removeResult.outcome === 'rejected')
          toast.error(
            resolveCanvasExplorerCopy(getApplicationLanguage()).deleteEmptyModelUnavailable
          );
        return;
      }
      viewState.current = { ...viewState.current, ...removeResult.state };

      applyCanvasGraphLifecycleFallout({
        currentState: { ...command.currentState, draftSession: removeResult.state.draftSession },
        nextState: removeResult.state,
        setNodes,
        setEdges,
        setDraftSession,
        setSelectedNodes: reconcileSelectionAfterNodeRemoval,
        setInspectorNode,
      });
      toast.success(formatCanvasNodeRemovedMessage(removeResult.removedNodeName));
    },
    [
      viewState,
      runDraftSessionCommand,
      setDraftSession,
      setEdges,
      setInspectorNode,
      setNodes,
      reconcileSelectionAfterNodeRemoval,
    ]
  );
}

export function useCanvasNodeRemovalHandlers(
  { state, effects, policy }: UseCanvasNodeRemovalHandlersArgs,
  runDraftSessionCommand: CanvasDraftSessionCommandRunner
): UseCanvasNodeRemovalHandlersResult {
  const { canEditEdges } = policy;
  const viewState = useRef(state);
  viewState.current = state;
  const pendingRemovals = usePendingCanvasRemovals(runDraftSessionCommand, canEditEdges);
  const commitRemoval = useCanvasNodeRemovalCommit(effects, viewState, runDraftSessionCommand);
  const handleRemoveNode = useCallback(
    (nodeId: string, intent: 'placement' | 'empty-definition' = 'placement') => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      // React Flow must finish the activating click before disposing its card.
      const timer = setTimeout(() => {
        pendingRemovals.current.delete(timer);
        commitRemoval(nodeId, intent);
      }, 0);
      pendingRemovals.current.add(timer);
    },
    [canEditEdges, commitRemoval, pendingRemovals]
  );

  return {
    handleRemoveNode,
  };
}
