/** Owned concern: admit explicit dropped nodes into the draft graph through the node lifecycle API. */

import { useCallback } from 'react';
import { toast } from 'sonner';

import { CANONICAL_NODE_DRAG_MIME_TYPE, type CanonicalNode } from '../../types/canonical';
import type { CanvasNodeDropContracts } from './canvasGraphHandlerContracts';
import { canvasDraftSessionWorkingSet } from './canvasDraftSessionWorkingSet';
import { canvasViewCopy, formatCanvasNodeAddedMessage } from './copy';
import { parseCanonicalNodeDragPayload } from './canvasNodeDropPayload';
import { hasDbtCompatibilityMetadata } from './canvasDbtAuthoringModel';
import { useCanvasNodeAdmissionCommandRunner } from './useCanvasNodeAdmissionCommandRunner';

type UseCanvasNodeDropHandlersArgs = CanvasNodeDropContracts;

type UseCanvasNodeDropHandlersResult = {
  handleDrop: React.DragEventHandler<HTMLDivElement>;
  handleDragOver: React.DragEventHandler<HTMLDivElement>;
  handleAttachSchemaToNode: (nodeId: string, schemaName: string) => void;
};

export function useCanvasNodeDropHandlers({
  state,
  effects,
  policy,
}: UseCanvasNodeDropHandlersArgs): UseCanvasNodeDropHandlersResult {
  const { canonicalNodesById, draftSession, nodes } = state;
  const { setNodes, setDraftSession } = effects;
  const { graphStrategy, canEditEdges, columnLevelLineageEnabled, allowsCanonicalNode } = policy;
  const runAdmissionCommand = useCanvasNodeAdmissionCommandRunner({
    state: {
      draftSession,
      nodes,
    },
    effects: {
      setNodes,
      setDraftSession,
    },
    policy: {
      columnLevelLineageEnabled,
      allowsCanonicalNode,
    },
  });

  const handleDrop = useCallback<React.DragEventHandler<HTMLDivElement>>(
    (event) => {
      event.preventDefault();
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }

      const canonicalDragNode = parseCanonicalNodeDragPayload(
        event.dataTransfer.getData(CANONICAL_NODE_DRAG_MIME_TYPE)
      );
      let pluginDragNode: CanonicalNode | null = null;
      if (canonicalDragNode == null && graphStrategy != null) {
        try {
          pluginDragNode = graphStrategy.parseDropPayload(event.dataTransfer);
        } catch {
          toast.error(canvasViewCopy.nodeDropPayloadInvalidMessage);
          return;
        }
      }

      const canonicalNode = canonicalDragNode ?? pluginDragNode;
      if (!canonicalNode) {
        return;
      }

      const reactFlowBounds = (event.target as HTMLElement).getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 100,
        y: event.clientY - reactFlowBounds.top - 40,
      };

      runAdmissionCommand({
        canonicalNode,
        position,
        onNoop: (reason) => {
          toast.info(reason);
        },
        onAdded: (addedNode) => {
          toast.success(formatCanvasNodeAddedMessage(addedNode.name));
        },
      });
    },
    [canEditEdges, graphStrategy, runAdmissionCommand]
  );

  const handleDragOver = useCallback<React.DragEventHandler<HTMLDivElement>>((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleAttachSchemaToNode = useCallback(
    (nodeId: string, schemaName: string) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }

      const normalizedSchemaName = schemaName.trim();
      const targetNode = canonicalNodesById.get(nodeId);
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

      if (hasDbtCompatibilityMetadata(targetNode)) {
        nextMetadata.dbt = {
          ...readRecord(existingMetadata.dbt),
          schemaName: normalizedSchemaName,
        };
      }

      const nextNode = {
        ...targetNode,
        metadata: nextMetadata,
      };
      const nextNodes = nodes.map((node) =>
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

      setNodes(nextNodes);
      setDraftSession(canvasDraftSessionWorkingSet.upsertNode(draftSession, nextNode));
      toast.success(`Schema ${normalizedSchemaName} assigned to ${targetNode.name}.`);
    },
    [canEditEdges, canonicalNodesById, draftSession, nodes, setDraftSession, setNodes]
  );

  return {
    handleDrop,
    handleDragOver,
    handleAttachSchemaToNode,
  };
}
