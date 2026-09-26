/** Owned concern: translate column-port gestures into governed column commands. */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import type {
  GraphNodeColumnOutputToggleIdentity,
  GraphNodeColumnReorderIdentity,
} from '../../plugins/graph/graphNodeColumnContracts';
import { automapCanvasColumns } from './canvasColumnAutomap';
import { removeCanvasColumnMapping } from './canvasColumnMappingAuthoring';
import { resolveCanvasSessionNode } from './canvasColumnMappingModel';
import {
  useCanvasColumnMappingGesture,
  formatColumnMappingRejection,
} from './useCanvasColumnMappingGesture';
import {
  createCanvasColumnHandleId,
  type CanvasColumnHandleIdentity,
  type CanvasColumnLineageEdgeData,
} from './canvasColumnLineageProjection';
import type { CanvasEdgeAuthoringContracts } from './canvasGraphHandlerContracts';
import { canvasViewCopy } from './copy';
import type { CanvasColumnAuthoringCommandRunner } from './useCanvasColumnAuthoringCommandRunner';
import { type CanvasRelationalPredicateSeed } from './canvasRelationalPredicateSeed';

export function useCanvasColumnConnectionHandlers(
  { state, effects, policy }: CanvasEdgeAuthoringContracts,
  columnAuthoringCommandRunner: CanvasColumnAuthoringCommandRunner
) {
  const [pendingSource, setPendingSource] = useState<CanvasColumnHandleIdentity | null>(null);
  const [relationalPredicateSeed, setRelationalPredicateSeed] =
    useState<CanvasRelationalPredicateSeed | null>(null);
  const { canonicalNodesById, draftSession } = state;
  const { setDraftSession } = effects;
  const { canEditEdges } = policy;

  const tryColumnConnection = useCanvasColumnMappingGesture(
    { state, effects, policy },
    columnAuthoringCommandRunner,
    { setPendingSource, setRelationalPredicateSeed }
  );

  const handleColumnPortActivate = useCallback(
    (identity: CanvasColumnHandleIdentity) => {
      if (identity.direction === 'source') {
        setPendingSource(identity);
        setRelationalPredicateSeed(null);
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
    async (identity: GraphNodeColumnOutputToggleIdentity) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      const result = await columnAuthoringCommandRunner.toggleOutput(identity);
      if (result.outcome === 'rejected') {
        toast.error(formatColumnMappingRejection(result.reason));
      }
    },
    [canEditEdges, columnAuthoringCommandRunner]
  );

  const handleReorderCanvasColumnOutput = useCallback(
    async (identity: GraphNodeColumnReorderIdentity) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      const result = await columnAuthoringCommandRunner.reorderOutput(identity);
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
      const targetNode = resolveCanvasSessionNode(
        draftSession,
        canonicalNodesById,
        mapping.targetNodeId
      );
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
    relationalPredicateSeed,
    clearRelationalPredicateSeed: () => setRelationalPredicateSeed(null),
  };
}
