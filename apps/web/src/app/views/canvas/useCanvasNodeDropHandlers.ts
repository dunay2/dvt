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
import type {
  CanvasNodeDropContracts,
  CanvasNodeInstantiationHandler,
} from './canvasGraphHandlerContracts';
import { canvasDraftSessionWorkingSet } from './canvasDraftSessionWorkingSet';
import { canvasViewCopy, formatCanvasNodeAddedMessage } from './copy';
import {
  CANVAS_CATALOG_NODE_DRAG_MIME_TYPE,
  CANVAS_NODE_DROP_GRAPH_ANCHOR,
  readCanvasCatalogNodeDragReference,
  parseCanonicalNodeDragPayload,
} from './canvasNodeDropPayload';
import { hasDbtCompatibilityMetadata } from './canvasDbtAuthoringModel';
import { useCanvasNodeAdmissionCommandRunner } from './useCanvasNodeAdmissionCommandRunner';
import { createCanvasNodeInstance } from './canvasNodeInstance';
import { workspaceNodeDefinitionId, readWorkspaceDbtModelReference } from '@dvt/contracts';

type UseCanvasNodeDropHandlersArgs = CanvasNodeDropContracts;

type UseCanvasNodeDropHandlersResult = {
  handleInstantiateNode: CanvasNodeInstantiationHandler;
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
  const latestDraftSessionRef = useRef(draftSession);
  latestDraftSessionRef.current = draftSession;
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

  const admit = useCallback(
    (
      canonicalNode: CanonicalNode,
      position: { x: number; y: number },
      definition?: CanonicalNode
    ) => {
      const transaction = runAdmissionCommand({
        canonicalNode,
        ...(definition == null ? {} : { definition }),
        position,
        onNoop: (reason) => toast.info(reason),
        onAdded: (addedNode) => toast.success(formatCanvasNodeAddedMessage(addedNode.name)),
      });
      if (transaction.outcome === 'added') {
        latestNodesRef.current = transaction.nodes;
        latestDraftSessionRef.current = transaction.draftSession;
      }
    },
    [runAdmissionCommand]
  );
  const handleInstantiateNode = useCallback(
    (nodeId: string, position: { x: number; y: number }, discovered?: CanonicalNode) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      const definition =
        latestDraftSessionRef.current.localNodeCatalog?.[nodeId] ??
        canonicalNodesById.get(nodeId) ??
        discovered;
      if (
        definition == null ||
        definition.id !== nodeId ||
        workspaceNodeDefinitionId(definition) != null ||
        definition.metadata?.authority === 'dbt-project-files' ||
        (definition.role !== 'input' && definition.kind !== 'dvt:transform')
      ) {
        toast.error(canvasViewCopy.nodeDropPayloadInvalidMessage);
        return;
      }
      try {
        if (
          discovered != null &&
          (readWorkspaceDbtModelReference(definition) == null ||
            definition.metadata?.transformAuthoring != null)
        )
          throw new Error('External definitions require a file-model reference.');
        const node = createCanvasNodeInstance(
          definition,
          new Set(latestNodesRef.current.map((placed) => placed.data.name))
        );
        admit(node, position, discovered == null ? undefined : definition);
      } catch {
        toast.error(canvasViewCopy.nodeDropPayloadInvalidMessage);
      }
    },
    [admit, canEditEdges, canonicalNodesById]
  );

  const handleDrop = useCallback<React.DragEventHandler<HTMLDivElement>>(
    (event) => {
      event.preventDefault();
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }

      const isCatalogueDrop = event.dataTransfer.types?.includes(
        CANVAS_CATALOG_NODE_DRAG_MIME_TYPE
      );
      const reference = isCatalogueDrop
        ? readCanvasCatalogNodeDragReference(event.dataTransfer)
        : null;
      const position = () => {
        const flowPosition = screenToFlowPosition(
          { x: event.clientX, y: event.clientY },
          { snapToGrid: false }
        );
        return {
          x: flowPosition.x - CANVAS_NODE_DROP_GRAPH_ANCHOR.x,
          y: flowPosition.y - CANVAS_NODE_DROP_GRAPH_ANCHOR.y,
        };
      };
      if (isCatalogueDrop) {
        if (
          reference == null ||
          reference.scopeKey != null ||
          !canonicalNodesById.has(reference.id)
        )
          toast.error(canvasViewCopy.nodeDropPayloadInvalidMessage);
        else handleInstantiateNode(reference.id, position());
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

      try {
        if (readWorkspaceDbtModelReference(canonicalNode) != null)
          handleInstantiateNode(canonicalNode.id, position(), canonicalNode);
        else admit(canonicalNode, position());
      } catch {
        toast.error(canvasViewCopy.nodeDropPayloadInvalidMessage);
      }
    },
    [
      admit,
      canEditEdges,
      canonicalNodesById,
      graphStrategy,
      handleInstantiateNode,
      screenToFlowPosition,
    ]
  );

  const handleDragOver = useCallback<React.DragEventHandler<HTMLDivElement>>(
    (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = !canEditEdges
        ? 'none'
        : event.dataTransfer.types?.includes(CANVAS_CATALOG_NODE_DRAG_MIME_TYPE)
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
      const definitionId = workspaceNodeDefinitionId(selectedNode) ?? nodeId;
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
        (workspaceNodeDefinitionId(canonicalNodesById.get(node.id)) ?? node.id) === definitionId
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
    handleInstantiateNode,
    handleDrop,
    handleDragOver,
    handleAttachSchemaToNode,
  };
}
