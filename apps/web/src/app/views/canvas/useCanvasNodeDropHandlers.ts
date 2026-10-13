/**
 * Owned concern: admit explicit dropped nodes into the draft graph through the node lifecycle API.
 * @baseline GH-3630: screen offsets are not graph coordinates after viewport pan or zoom.
 * @decision Delegate projection to the active viewport, then preserve the graph-unit drop anchor.
 * @consequence Identity, admission, existing saved positions and movement snapping stay unchanged.
 * @version 1.0.1
 */

import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useReactFlow } from '@xyflow/react';

import { CANONICAL_NODE_DRAG_MIME_TYPE, type CanonicalNode } from '../../types/canonical';
import type { CanvasNodeDropContracts } from './canvasGraphHandlerContracts';
import { canvasDraftSessionWorkingSet } from './canvasDraftSessionWorkingSet';
import { canvasViewCopy, formatCanvasNodeAddedMessage } from './copy';
import {
  CANVAS_SOURCE_CATALOG_DRAG_MIME_TYPE,
  parseCanonicalNodeDragPayload,
} from './canvasNodeDropPayload';
import { hasDbtCompatibilityMetadata } from './canvasDbtAuthoringModel';
import { useCanvasNodeAdmissionCommandRunner } from './useCanvasNodeAdmissionCommandRunner';
import { createCanvasSourceInstance } from './canvasSourceInstance';

const CANVAS_NODE_DROP_GRAPH_ANCHOR = { x: 100, y: 40 } as const;

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
  const { screenToFlowPosition } = useReactFlow();
  const latestNodesRef = useRef(nodes);
  latestNodesRef.current = nodes;
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

      const sourceId = event.dataTransfer.types?.includes(CANVAS_SOURCE_CATALOG_DRAG_MIME_TYPE)
        ? event.dataTransfer.getData(CANVAS_SOURCE_CATALOG_DRAG_MIME_TYPE)
        : '';
      const registeredSource = sourceId ? canonicalNodesById.get(sourceId) : null;
      if (
        sourceId &&
        (registeredSource?.role !== 'input' || registeredSource.sourceDefinitionId != null)
      ) {
        toast.error(canvasViewCopy.nodeDropPayloadInvalidMessage);
        return;
      }
      const canonicalDragNode =
        registeredSource ??
        parseCanonicalNodeDragPayload(event.dataTransfer.getData(CANONICAL_NODE_DRAG_MIME_TYPE));
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

      const flowPosition = screenToFlowPosition(
        { x: event.clientX, y: event.clientY },
        { snapToGrid: false }
      );
      const position = {
        x: flowPosition.x - CANVAS_NODE_DROP_GRAPH_ANCHOR.x,
        y: flowPosition.y - CANVAS_NODE_DROP_GRAPH_ANCHOR.y,
      };

      const admittedNode =
        registeredSource == null
          ? canonicalNode
          : createCanvasSourceInstance(
              registeredSource,
              new Set(latestNodesRef.current.map((node) => node.data.name))
            );
      const transaction = runAdmissionCommand({
        canonicalNode: admittedNode,
        position,
        onNoop: (reason) => {
          toast.info(reason);
        },
        onAdded: (addedNode) => {
          toast.success(formatCanvasNodeAddedMessage(addedNode.name));
        },
      });
      if (transaction.outcome === 'added') latestNodesRef.current = transaction.nodes;
    },
    [canEditEdges, canonicalNodesById, graphStrategy, runAdmissionCommand, screenToFlowPosition]
  );

  const handleDragOver = useCallback<React.DragEventHandler<HTMLDivElement>>(
    (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = !canEditEdges
        ? 'none'
        : event.dataTransfer.types?.includes(CANVAS_SOURCE_CATALOG_DRAG_MIME_TYPE)
          ? 'copy'
          : 'move';
    },
    [canEditEdges]
  );

  const handleAttachSchemaToNode = useCallback(
    (nodeId: string, schemaName: string) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }

      const normalizedSchemaName = schemaName.trim();
      const selectedNode = canonicalNodesById.get(nodeId);
      const definitionId = selectedNode?.sourceDefinitionId ?? nodeId;
      const targetNode =
        draftSession.localNodeCatalog?.[definitionId] ?? canonicalNodesById.get(definitionId);
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
      const nextNodes = latestNodesRef.current.map((node) =>
        (canonicalNodesById.get(node.id)?.sourceDefinitionId ?? node.id) === definitionId
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
      setDraftSession(canvasDraftSessionWorkingSet.updateNodeDefinition(draftSession, nextNode));
      toast.success(`Schema ${normalizedSchemaName} assigned to ${targetNode.name}.`);
    },
    [canEditEdges, canonicalNodesById, draftSession, setDraftSession, setNodes]
  );

  return {
    handleDrop,
    handleDragOver,
    handleAttachSchemaToNode,
  };
}
