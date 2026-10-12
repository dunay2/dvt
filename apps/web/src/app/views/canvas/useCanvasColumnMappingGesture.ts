/** External field gestures bind a producer to consumer Input, never to Output. */
import type { Connection } from '@xyflow/react';
import { useCallback } from 'react';
import { toast } from 'sonner';
import type { GraphNodeInputMapping } from '../../plugins/graph/graphNodeColumnContracts';
import type { CanvasColumnMappingRejection } from './canvasColumnMappingModel';
import { parseCanvasColumnHandleId } from './canvasColumnHandleIdentity';
import { canvasViewCopy } from './copy';

export function formatColumnMappingRejection(reason: CanvasColumnMappingRejection): string {
  if (reason === 'source_not_connected')
    return canvasViewCopy.columnMappingRequiresDependencyMessage;
  if (reason === 'complex_expression_not_editable')
    return canvasViewCopy.columnMappingComplexExpressionMessage;
  if (reason === 'no_compatible_mappings')
    return canvasViewCopy.columnMappingNoCompatibleColumnsMessage;
  if (reason === 'source_output_required') return canvasViewCopy.sourceOutputRequiredMessage;
  if (reason === 'source_output_last_field') return canvasViewCopy.sourceOutputLastFieldMessage;
  return canvasViewCopy.columnMappingUnavailableMessage;
}

export function useCanvasColumnMappingGesture(
  canEdit: boolean,
  mapInput: (identity: GraphNodeInputMapping) => void
) {
  return useCallback(
    (connection: Connection): boolean => {
      const source = parseCanvasColumnHandleId(connection.sourceHandle);
      const target = parseCanvasColumnHandleId(connection.targetHandle);
      if (source == null && target == null) return false;
      if (
        !canEdit ||
        source?.direction !== 'source' ||
        target?.direction !== 'target' ||
        source.nodeId !== connection.source ||
        target.nodeId !== connection.target
      ) {
        toast.error(
          canEdit
            ? canvasViewCopy.columnMappingUnavailableMessage
            : canvasViewCopy.mutationUnavailableMessage
        );
        return true;
      }
      mapInput({
        source: { nodeId: source.nodeId, columnId: source.columnId },
        target: { nodeId: target.nodeId, inputId: target.columnId },
      });
      return true;
    },
    [canEdit, mapInput]
  );
}
