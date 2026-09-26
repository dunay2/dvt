/** Admit column-port gestures through the existing canonical field-authoring commands. */
import type { Connection } from '@xyflow/react';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { applyCanvasColumnMapping } from './canvasColumnMappingAuthoring';
import {
  resolveCanvasSessionNode,
  type CanvasColumnMappingRejection,
} from './canvasColumnMappingModel';
import { resolveCanvasColumnMappingTarget } from './canvasColumnProjectionAuthority';
import {
  parseCanvasColumnHandleId,
  type CanvasColumnHandleIdentity,
} from './canvasColumnLineageProjection';
import type { CanvasEdgeAuthoringContracts } from './canvasGraphHandlerContracts';
import { canvasViewCopy } from './copy';
import type { CanvasColumnAuthoringCommandRunner } from './useCanvasColumnAuthoringCommandRunner';
import {
  resolveCanvasRelationalPredicateSeed,
  type CanvasRelationalPredicateSeed,
} from './canvasRelationalPredicateSeed';

export function formatColumnMappingRejection(reason: CanvasColumnMappingRejection): string {
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

export function useCanvasColumnMappingGesture(
  { state, effects, policy }: CanvasEdgeAuthoringContracts,
  columnAuthoringCommandRunner: CanvasColumnAuthoringCommandRunner,
  selection: {
    setPendingSource: (source: CanvasColumnHandleIdentity | null) => void;
    setRelationalPredicateSeed: (seed: CanvasRelationalPredicateSeed | null) => void;
  }
) {
  const { canonicalNodesById, draftSession } = state;
  const { setDraftSession, setInspectorNode } = effects;
  const { canEditEdges } = policy;
  const { setPendingSource, setRelationalPredicateSeed } = selection;
  return useCallback(
    (connection: Connection): boolean => {
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
      const targetNode = resolveCanvasSessionNode(
        draftSession,
        canonicalNodesById,
        targetHandle.nodeId
      );
      const sourceNode = resolveCanvasSessionNode(
        draftSession,
        canonicalNodesById,
        sourceHandle.nodeId
      );
      if (
        sourceNode?.kind === 'dvt:transform' &&
        targetNode?.kind === 'dvt:transform' &&
        targetNode.metadata?.transformAuthoring != null
      ) {
        void columnAuthoringCommandRunner
          .toggleOutput({
            nodeId: targetNode.id,
            columnId: targetHandle.columnId,
            columnType: 'unknown',
            output: true,
            source: { nodeId: sourceNode.id, columnId: sourceHandle.columnId },
          })
          .then((result) => {
            if (result.outcome === 'rejected')
              toast.error(formatColumnMappingRejection(result.reason));
          });
        setPendingSource(null);
        return true;
      }
      const target =
        targetNode == null
          ? null
          : resolveCanvasColumnMappingTarget(targetNode, targetHandle.columnId);
      if (target == null) {
        toast.error(canvasViewCopy.columnMappingUnavailableMessage);
        return true;
      }
      const relationSeed = resolveCanvasRelationalPredicateSeed({
        draftSession,
        canonicalNodesById,
        source: { nodeId: sourceHandle.nodeId, columnId: sourceHandle.columnId },
        target,
      });
      if (relationSeed != null) {
        setRelationalPredicateSeed(relationSeed);
        setPendingSource(null);
        setInspectorNode(relationSeed.targetNodeId, 'columns');
        toast.info(canvasViewCopy.columnRelationProposedMessage);
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
      setRelationalPredicateSeed(null);
      toast.success(canvasViewCopy.columnMappingAddedMessage);
      return true;
    },
    [
      canEditEdges,
      canonicalNodesById,
      draftSession,
      setDraftSession,
      setInspectorNode,
      columnAuthoringCommandRunner,
      setPendingSource,
      setRelationalPredicateSeed,
    ]
  );
}
