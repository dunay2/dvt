/** Owned concern: duplicate visible nodes through a semantic command and the draft graph lifecycle. */

import { useCallback } from 'react';
import { toast } from 'sonner';

import { canvasGraphLifecycle } from './canvasGraphLifecycle';
import type { CanvasNodeDuplicateContracts } from './canvasGraphHandlerContracts';
import { dropCanonicalNode } from './canvasNodeDropAggregate';
import { buildDuplicateNodeCommand } from './canvasDuplicateNodeCommand';
import { canvasViewCopy, formatCanvasNodeAddedMessage } from './copy';

type UseCanvasNodeDuplicateHandlersArgs = CanvasNodeDuplicateContracts;

type UseCanvasNodeDuplicateHandlersResult = {
  handleDuplicateNode: (nodeId: string) => void;
};

export function useCanvasNodeDuplicateHandlers({
  state,
  effects,
  policy,
}: UseCanvasNodeDuplicateHandlersArgs): UseCanvasNodeDuplicateHandlersResult {
  const { canonicalNodesById, nodes } = state;
  const { setDraftSession, setInspectorNode, setNodes, setSelectedNodes } = effects;
  const { canEditEdges, columnLevelLineageEnabled, graphStrategy } = policy;

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }

      const sourceCanonicalNode = canonicalNodesById.get(nodeId);
      const sourceNode = nodes.find((candidate) => candidate.id === nodeId);
      if (sourceCanonicalNode == null || sourceNode == null) {
        toast.error(canvasViewCopy.nodeNotFoundInGraphMessage);
        return;
      }

      setNodes((existingNodes) => {
        const { canonicalNode, position } = buildDuplicateNodeCommand({
          sourceNode,
          sourceCanonicalNode,
          existingNodes,
        });
        const dropResult = dropCanonicalNode({
          canonicalNode,
          position,
          nodes: existingNodes,
          graphStrategy,
          columnLevelLineageEnabled,
        });

        if (dropResult.outcome === 'rejected') {
          toast.error(dropResult.reason);
          return existingNodes;
        }

        if (dropResult.outcome === 'noop') {
          toast.info(dropResult.reason);
          return existingNodes;
        }

        setDraftSession((currentSession) =>
          canvasGraphLifecycle.node.admitExplicit(currentSession, canonicalNode)
        );
        setSelectedNodes([canonicalNode.id]);
        setInspectorNode(canonicalNode.id);
        toast.success(formatCanvasNodeAddedMessage(canonicalNode.name));
        return dropResult.nextNodes;
      });
    },
    [
      canEditEdges,
      canonicalNodesById,
      columnLevelLineageEnabled,
      graphStrategy,
      nodes,
      setDraftSession,
      setInspectorNode,
      setNodes,
      setSelectedNodes,
    ]
  );

  return {
    handleDuplicateNode,
  };
}
