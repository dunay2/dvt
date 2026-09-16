/** Owned concern: translate column-port gestures into governed column commands. */
import { type Edge, type Node, type ReactFlowProps } from '@xyflow/react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import type {
  GraphNodeColumnOutputToggleIdentity,
  GraphNodeColumnReorderIdentity,
} from '../../plugins/graph/graphNodeColumnContracts';
import type { CanonicalNode } from '../../types/canonical';
import { automapCanvasColumns } from './canvasColumnAutomap';
import {
  applyCanvasColumnMapping,
  removeCanvasColumnMapping,
} from './canvasColumnMappingAuthoring';
import type { CanvasColumnMappingRejection } from './canvasColumnMappingModel';
import { resolveCanvasColumnMappingTarget } from './canvasColumnProjectionAuthority';
import {
  createCanvasColumnHandleId,
  parseCanvasColumnHandleId,
  type CanvasColumnHandleIdentity,
  type CanvasColumnLineageEdgeData,
} from './canvasColumnLineageProjection';
import type {
  CanvasEdgeAuthoringContracts,
  CanvasEdgeAuthoringState,
} from './canvasGraphHandlerContracts';
import { canvasViewCopy } from './copy';
import type { CanvasColumnAuthoringCommandRunner } from './useCanvasColumnAuthoringCommandRunner';

type PendingConnection = Parameters<NonNullable<ReactFlowProps<Node, Edge>['onConnect']>>[0];

function formatColumnMappingRejection(reason: CanvasColumnMappingRejection): string {
  if (reason === 'source_not_connected') {
    return canvasViewCopy.columnMappingRequiresDependencyMessage;
  }
  if (reason === 'complex_expression_not_editable') {
    return canvasViewCopy.columnMappingComplexExpressionMessage;
  }
  if (reason === 'no_compatible_mappings') {
    return canvasViewCopy.columnMappingNoCompatibleColumnsMessage;
  }
  if (reason === 'source_output_required') {
    return canvasViewCopy.sourceOutputRequiredMessage;
  }
  if (reason === 'source_output_last_field') {
    return canvasViewCopy.sourceOutputLastFieldMessage;
  }
  return canvasViewCopy.columnMappingUnavailableMessage;
}

function resolveCurrentNode(
  draftSession: CanvasEdgeAuthoringState['draftSession'],
  canonicalNodesById: CanvasEdgeAuthoringState['canonicalNodesById'],
  nodeId: string
): CanonicalNode | undefined {
  return draftSession.localNodeCatalog?.[nodeId] ?? canonicalNodesById.get(nodeId);
}

export function useCanvasColumnConnectionHandlers(
  { state, effects, policy }: CanvasEdgeAuthoringContracts,
  columnAuthoringCommandRunner: CanvasColumnAuthoringCommandRunner
) {
  const [pendingSource, setPendingSource] = useState<CanvasColumnHandleIdentity | null>(null);
  const { canonicalNodesById, draftSession } = state;
  const { setDraftSession } = effects;
  const { canEditEdges } = policy;

  const tryColumnConnection = useCallback(
    (connection: PendingConnection): boolean => {
      const sourceHandle = parseCanvasColumnHandleId(connection.sourceHandle);
      const targetHandle = parseCanvasColumnHandleId(connection.targetHandle);
      if (sourceHandle == null && targetHandle == null) return false;
      if (
        !canEditEdges ||
        sourceHandle?.direction !== 'source' ||
        targetHandle?.direction !== 'target' ||
        sourceHandle.nodeId !== connection.source ||
        targetHandle.nodeId !== connection.target
      ) {
        toast.error(
          canEditEdges
            ? canvasViewCopy.columnMappingUnavailableMessage
            : canvasViewCopy.mutationUnavailableMessage
        );
        return true;
      }
      const targetNode = resolveCurrentNode(draftSession, canonicalNodesById, targetHandle.nodeId);
      const target =
        targetNode == null
          ? null
          : resolveCanvasColumnMappingTarget(targetNode, targetHandle.columnId);
      if (target == null) {
        toast.error(canvasViewCopy.columnMappingUnavailableMessage);
        return true;
      }
      const result = applyCanvasColumnMapping({
        draftSession,
        canonicalNodesById,
        source: { nodeId: sourceHandle.nodeId, columnId: sourceHandle.columnId },
        target,
      });
      if (result.outcome === 'rejected') {
        toast.error(formatColumnMappingRejection(result.reason));
        return true;
      }
      setDraftSession(result.draftSession);
      setPendingSource(null);
      toast.success(canvasViewCopy.columnMappingAddedMessage);
      return true;
    },
    [canEditEdges, canonicalNodesById, draftSession, setDraftSession]
  );

  const handleColumnPortActivate = useCallback(
    (identity: CanvasColumnHandleIdentity) => {
      if (identity.direction === 'source') {
        setPendingSource(identity);
        toast.info(
          canvasViewCopy.columnMappingSourceSelectedTemplate.replace('{column}', identity.columnId)
        );
        return;
      }
      if (pendingSource == null) {
        toast.error(canvasViewCopy.columnMappingUnavailableMessage);
        return;
      }
      tryColumnConnection({
        source: pendingSource.nodeId,
        sourceHandle: createCanvasColumnHandleId(pendingSource),
        target: identity.nodeId,
        targetHandle: createCanvasColumnHandleId(identity),
      });
    },
    [pendingSource, tryColumnConnection]
  );

  const handleAutomapCanvasColumns = useCallback(
    (nodeId: string, columns: readonly Readonly<{ name: string; type: string }>[]) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      const result = automapCanvasColumns({
        draftSession,
        canonicalNodesById,
        targetNodeId: nodeId,
        targetColumns: columns,
      });
      if (result.outcome === 'rejected') {
        toast.error(formatColumnMappingRejection(result.reason));
        return;
      }
      setDraftSession(result.draftSession);
      toast.success(
        canvasViewCopy.columnMappingAutomapSummaryTemplate.replace(
          '{count}',
          String(result.appliedCount)
        )
      );
    },
    [canEditEdges, canonicalNodesById, draftSession, setDraftSession]
  );

  const handleToggleCanvasColumnOutput = useCallback(
    (identity: GraphNodeColumnOutputToggleIdentity) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      const result = columnAuthoringCommandRunner.toggleOutput(identity);
      if (result.outcome === 'rejected') {
        toast.error(formatColumnMappingRejection(result.reason));
      }
    },
    [canEditEdges, columnAuthoringCommandRunner]
  );

  const handleReorderCanvasColumnOutput = useCallback(
    (identity: GraphNodeColumnReorderIdentity) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      const result = columnAuthoringCommandRunner.reorderOutput(identity);
      if (result.outcome === 'rejected') {
        toast.error(formatColumnMappingRejection(result.reason));
      }
    },
    [canEditEdges, columnAuthoringCommandRunner]
  );

  const handleRemoveColumnMapping = useCallback(
    (mapping: CanvasColumnLineageEdgeData) => {
      if (!canEditEdges || !mapping.removable) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      const targetNode = resolveCurrentNode(draftSession, canonicalNodesById, mapping.targetNodeId);
      if (targetNode == null) {
        toast.error(canvasViewCopy.columnMappingUnavailableMessage);
        return;
      }
      const result = removeCanvasColumnMapping({
        draftSession,
        canonicalNodesById,
        targetNode,
        outputId: mapping.outputId,
        source: {
          nodeId: mapping.sourceNodeId,
          columnId: mapping.sourceFieldId,
        },
      });
      if (result.outcome === 'rejected') {
        toast.error(formatColumnMappingRejection(result.reason));
        return;
      }
      setDraftSession(result.draftSession);
      toast.success(canvasViewCopy.columnMappingRemovedMessage);
    },
    [canEditEdges, canonicalNodesById, draftSession, setDraftSession]
  );

  return {
    tryColumnConnection,
    activeColumnHandleId: pendingSource == null ? null : createCanvasColumnHandleId(pendingSource),
    handleColumnPortActivate,
    handleAutomapCanvasColumns,
    handleToggleCanvasColumnOutput,
    handleReorderCanvasColumnOutput,
    handleRemoveColumnMapping,
  };
}
