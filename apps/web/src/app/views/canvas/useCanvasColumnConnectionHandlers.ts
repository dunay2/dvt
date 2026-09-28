/** Owned concern: translate column-port gestures into governed column commands. */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import type {
  GraphNodeColumnOutputToggleIdentity,
  GraphNodeColumnReorderIdentity,
  GraphNodeInputMapping,
} from '../../plugins/graph/graphNodeColumnContracts';
import {
  useCanvasColumnMappingGesture,
  formatColumnMappingRejection,
} from './useCanvasColumnMappingGesture';
import {
  createCanvasColumnHandleId,
  type CanvasColumnHandleIdentity,
} from './canvasColumnHandleIdentity';
import { type CanvasColumnLineageEdgeData } from './canvasColumnLineageEdgeModel';
import type { CanvasEdgeAuthoringContracts } from './canvasGraphHandlerContracts';
import { canvasViewCopy } from './copy';
import type { CanvasColumnAuthoringCommandRunner } from './useCanvasColumnAuthoringCommandRunner';

export function useCanvasColumnConnectionHandlers(
  { policy }: CanvasEdgeAuthoringContracts,
  columnAuthoringCommandRunner: CanvasColumnAuthoringCommandRunner
) {
  const [pendingSource, setPendingSource] = useState<CanvasColumnHandleIdentity | null>(null);
  const { canEditEdges } = policy;

  const handleMapCanvasInput = useCallback(
    (identity: GraphNodeInputMapping) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      void columnAuthoringCommandRunner.mapInput(identity).then((result) => {
        if (result.outcome === 'rejected') toast.error(formatColumnMappingRejection(result.reason));
        else {
          setPendingSource(null);
          toast.success(canvasViewCopy.columnMappingAddedMessage);
        }
      });
    },
    [canEditEdges, columnAuthoringCommandRunner]
  );
  const tryColumnConnection = useCanvasColumnMappingGesture(canEditEdges, handleMapCanvasInput);

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

  const handleToggleCanvasColumnOutput = useCallback(
    (identity: GraphNodeColumnOutputToggleIdentity) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      void columnAuthoringCommandRunner.toggleOutput(identity).then((result) => {
        if (result.outcome === 'rejected') {
          toast.error(formatColumnMappingRejection(result.reason));
        }
      });
    },
    [canEditEdges, columnAuthoringCommandRunner]
  );

  const handleReorderCanvasColumnOutput = useCallback(
    (identity: GraphNodeColumnReorderIdentity) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      void columnAuthoringCommandRunner.reorderOutput(identity).then((result) => {
        if (result.outcome === 'rejected') {
          toast.error(formatColumnMappingRejection(result.reason));
        }
      });
    },
    [canEditEdges, columnAuthoringCommandRunner]
  );

  const handleRemoveCanvasInput = useCallback(
    (identity: GraphNodeInputMapping) => {
      if (!canEditEdges) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      void columnAuthoringCommandRunner.removeInput(identity).then((result) => {
        if (result.outcome === 'rejected') toast.error(formatColumnMappingRejection(result.reason));
        else toast.success(canvasViewCopy.columnMappingRemovedMessage);
      });
    },
    [canEditEdges, columnAuthoringCommandRunner]
  );

  const handleRemoveColumnMapping = useCallback(
    (mapping: CanvasColumnLineageEdgeData) => {
      if (!canEditEdges || !mapping.removable) {
        toast.error(canvasViewCopy.mutationUnavailableMessage);
        return;
      }
      handleRemoveCanvasInput({
        target: { nodeId: mapping.targetNodeId, inputId: mapping.outputId },
        source: { nodeId: mapping.sourceNodeId, columnId: mapping.sourceFieldId },
      });
    },
    [canEditEdges, handleRemoveCanvasInput]
  );

  return {
    tryColumnConnection,
    activeColumnHandleId: pendingSource == null ? null : createCanvasColumnHandleId(pendingSource),
    handleColumnPortActivate,
    handleMapCanvasInput,
    handleRemoveCanvasInput,
    handleToggleCanvasColumnOutput,
    handleReorderCanvasColumnOutput,
    handleRemoveColumnMapping,
  };
}
