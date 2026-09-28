/** Dispatch explicit non-relational output edits to their owning source, dbt or structured commands. */
import type {
  GraphNodeColumnOutputToggleIdentity,
  GraphNodeColumnReorderIdentity,
} from '../../plugins/graph/graphNodeColumnContracts';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  reorderCanvasColumnOutput,
  setCanvasColumnOutputIncluded,
} from './canvasColumnOutputAuthoring';
import {
  resolveCanvasSessionNode,
  type CanvasColumnMappingResult,
} from './canvasColumnMappingModel';
import { isDbtCompatibleModel } from './canvasDbtAuthoringModel';
import {
  configureDbtModelColumnOrder,
  configureDbtModelColumnOutput,
} from './canvasDbtModelColumnCommand';
import { reorderCanvasStructuredFieldChildren } from './canvasStructuredFieldAuthoring';

export function applyToggleOutput(
  draftSession: CanvasDraftSession,
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>,
  identity: GraphNodeColumnOutputToggleIdentity
): CanvasColumnMappingResult {
  const targetNode = resolveCanvasSessionNode(draftSession, canonicalNodesById, identity.nodeId);
  if (targetNode != null && isDbtCompatibleModel(targetNode)) {
    const result = configureDbtModelColumnOutput({
      draftSession,
      canonicalNodesById,
      nodeId: identity.nodeId,
      columnName: identity.columnId,
      output: identity.output,
    });
    return result.outcome === 'applied'
      ? result
      : { outcome: 'rejected', reason: 'invalid_transform_authority' };
  }

  return setCanvasColumnOutputIncluded({
    draftSession,
    canonicalNodesById,
    targetNodeId: identity.nodeId,
    columnId: identity.columnId,
    output: identity.output,
    placement: identity.placement,
  });
}

export function applyReorderOutput(
  draftSession: CanvasDraftSession,
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>,
  identity: GraphNodeColumnReorderIdentity
): CanvasColumnMappingResult {
  if (identity.parentColumnId != null) {
    const result = reorderCanvasStructuredFieldChildren({
      draftSession,
      canonicalNodesById,
      request: {
        nodeId: identity.nodeId,
        parentFieldId: identity.parentColumnId,
        fieldId: identity.columnId,
        targetFieldId: identity.targetColumnId,
        placement: identity.placement,
      },
    });
    return result.outcome === 'applied'
      ? result
      : { outcome: 'rejected', reason: 'mapping_not_found' };
  }

  const targetNode = resolveCanvasSessionNode(draftSession, canonicalNodesById, identity.nodeId);
  if (targetNode != null && isDbtCompatibleModel(targetNode)) {
    const result = configureDbtModelColumnOrder({
      draftSession,
      canonicalNodesById,
      nodeId: identity.nodeId,
      columnName: identity.columnId,
      targetColumnName: identity.targetColumnId,
      placement: identity.placement,
    });
    return result.outcome === 'applied'
      ? result
      : { outcome: 'rejected', reason: 'invalid_transform_authority' };
  }

  return reorderCanvasColumnOutput({
    draftSession,
    canonicalNodesById,
    targetNodeId: identity.nodeId,
    columnId: identity.columnId,
    targetColumnId: identity.targetColumnId,
    placement: identity.placement,
  });
}
