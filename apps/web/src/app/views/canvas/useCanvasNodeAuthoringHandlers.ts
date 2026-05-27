/** Owned concern: compose node creation, drop, and removal handlers over node authoring contracts. */

import { useCallback } from 'react';
import { toast } from 'sonner';

import { canvasDraftSessionWorkingSet } from './canvasDraftSessionWorkingSet';
import type {
  CanvasAuthoringNodeCreationContracts,
  CanvasNodeAuthoringContracts,
  CanvasNodeDuplicateContracts,
  CanvasNodeDropContracts,
  CanvasNodeRemovalContracts,
  CreateCanvasAuthoringNode,
} from './canvasGraphHandlerContracts';
import { canvasViewCopy } from './copy';
import { useCanvasAuthoringNodeCreationHandlers } from './useCanvasAuthoringNodeCreationHandlers';
import { useCanvasNodeDuplicateHandlers } from './useCanvasNodeDuplicateHandlers';
import { useCanvasNodeDropHandlers } from './useCanvasNodeDropHandlers';
import { useCanvasNodeRemovalHandlers } from './useCanvasNodeRemovalHandlers';

type UseCanvasNodeAuthoringHandlersArgs = CanvasNodeAuthoringContracts;

type UseCanvasNodeAuthoringHandlersResult = {
  handleDrop: React.DragEventHandler<HTMLDivElement>;
  handleDragOver: React.DragEventHandler<HTMLDivElement>;
  handleCreateAuthoringNode: CreateCanvasAuthoringNode;
  handleDuplicateNode: (nodeId: string) => void;
  handleRemoveNode: (nodeId: string) => void;
  handleAttachSchemaToNode: (nodeId: string, schemaName: string) => void;
};

export function useCanvasNodeAuthoringHandlers({
  state,
  effects,
  policy,
}: UseCanvasNodeAuthoringHandlersArgs): UseCanvasNodeAuthoringHandlersResult {
  const nodeDropContracts: CanvasNodeDropContracts = {
    state: {
      draftSession: state.draftSession,
      nodes: state.nodes,
    },
    effects,
    policy,
  };
  const nodeDropHandlers = useCanvasNodeDropHandlers(nodeDropContracts);
  const nodeCreationContracts: CanvasAuthoringNodeCreationContracts = {
    state: {
      draftSession: state.draftSession,
      nodes: state.nodes,
    },
    effects: {
      setNodes: effects.setNodes,
      setDraftSession: effects.setDraftSession,
      setSelectedNodes: effects.setSelectedNodes,
      setInspectorNode: effects.setInspectorNode,
    },
    policy: {
      canEditEdges: policy.canEditEdges,
      columnLevelLineageEnabled: policy.columnLevelLineageEnabled,
      allowsCanonicalNode: policy.allowsCanonicalNode,
    },
  };
  const nodeCreationHandlers = useCanvasAuthoringNodeCreationHandlers(nodeCreationContracts);
  const nodeDuplicateContracts: CanvasNodeDuplicateContracts = {
    state: {
      canonicalNodesById: state.canonicalNodesById,
      draftSession: state.draftSession,
      nodes: state.nodes,
    },
    effects: {
      setNodes: effects.setNodes,
      setDraftSession: effects.setDraftSession,
      setSelectedNodes: effects.setSelectedNodes,
      setInspectorNode: effects.setInspectorNode,
    },
    policy: {
      canEditEdges: policy.canEditEdges,
      columnLevelLineageEnabled: policy.columnLevelLineageEnabled,
    },
  };
  const nodeDuplicateHandlers = useCanvasNodeDuplicateHandlers(nodeDuplicateContracts);

  const nodeRemovalContracts: CanvasNodeRemovalContracts = {
    state,
    effects,
    policy: {
      canEditEdges: policy.canEditEdges,
    },
  };
  const nodeRemovalHandlers = useCanvasNodeRemovalHandlers(nodeRemovalContracts);
  const handleAttachSchemaToNode = useCallback(
    (nodeId: string, schemaName: string) => {
      if (!policy.canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }

      const normalizedSchemaName = schemaName.trim();
      const targetNode = state.canonicalNodesById.get(nodeId);
      if (targetNode == null) {
        toast.error(canvasViewCopy.nodeNotFoundInGraphMessage);
        return;
      }
      if (normalizedSchemaName.length === 0) {
        toast.info('Schema resource is empty and cannot be assigned.');
        return;
      }

      const readRecord = (value: unknown): Record<string, unknown> =>
        value !== null && typeof value === 'object' && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const existingMetadata = readRecord(targetNode.metadata);
      const nextMetadata: Record<string, unknown> = {
        ...existingMetadata,
        schema: normalizedSchemaName,
        config: {
          ...readRecord(existingMetadata.config),
          schema: normalizedSchemaName,
        },
      };

      if (targetNode.pluginId === 'dbt') {
        nextMetadata.dbt = {
          ...readRecord(existingMetadata.dbt),
          schemaName: normalizedSchemaName,
        };
      }

      const nextNode = {
        ...targetNode,
        metadata: nextMetadata,
      };
      const nextNodes = state.nodes.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                metadata: nextMetadata,
              },
            }
          : node
      );

      effects.setNodes(nextNodes);
      effects.setDraftSession(
        canvasDraftSessionWorkingSet.upsertNode(state.draftSession, nextNode)
      );
      toast.success(`Schema ${normalizedSchemaName} assigned to ${targetNode.name}.`);
    },
    [effects, policy.canEditEdges, state.canonicalNodesById, state.draftSession, state.nodes]
  );

  return {
    ...nodeDropHandlers,
    ...nodeCreationHandlers,
    ...nodeDuplicateHandlers,
    ...nodeRemovalHandlers,
    handleAttachSchemaToNode,
  };
}
