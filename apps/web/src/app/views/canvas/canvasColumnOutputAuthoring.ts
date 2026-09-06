/** Owns output inclusion and ordering for canonical Transform projections. */
import type { CanonicalNode } from '../../types/canonical';
import { automapCanvasColumns } from './canvasColumnAutomap';
import { removeCanvasColumnMapping } from './canvasColumnMappingAuthoring';
import {
  resolveCanvasSessionNode,
  type CanvasColumnMappingResult,
} from './canvasColumnMappingModel';
import {
  persistCanvasProjectionOutputs,
  readEditableCanvasProjectionEntry,
} from './canvasColumnProjectionAuthority';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';

export function reorderCanvasColumnOutput(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  targetNodeId: string;
  columnId: string;
  targetColumnId: string;
  placement: 'before' | 'after';
}): CanvasColumnMappingResult {
  const targetNode = resolveCanvasSessionNode(
    args.draftSession,
    args.canonicalNodesById,
    args.targetNodeId
  );
  if (targetNode == null) return { outcome: 'rejected', reason: 'target_node_not_found' };
  const projectionResult = readEditableCanvasProjectionEntry({
    targetNode,
    edges: args.draftSession.workingSet.visibleEdges,
    resolveNode: (nodeId) =>
      resolveCanvasSessionNode(args.draftSession, args.canonicalNodesById, nodeId),
  });
  if (projectionResult.outcome === 'rejected') return projectionResult;
  if (projectionResult.projection == null) {
    return { outcome: 'rejected', reason: 'mapping_not_found' };
  }
  const outputs = [...projectionResult.projection.outputs];
  const sourceIndex = outputs.findIndex((output) => output.fieldId === args.columnId);
  if (sourceIndex < 0 || args.columnId === args.targetColumnId) {
    return { outcome: 'rejected', reason: 'mapping_not_found' };
  }
  const [movedOutput] = outputs.splice(sourceIndex, 1);
  const targetIndex = outputs.findIndex((output) => output.fieldId === args.targetColumnId);
  if (movedOutput == null || targetIndex < 0) {
    return { outcome: 'rejected', reason: 'mapping_not_found' };
  }
  outputs.splice(args.placement === 'after' ? targetIndex + 1 : targetIndex, 0, movedOutput);
  const persisted = persistCanvasProjectionOutputs({
    targetNode,
    resolveNode: (nodeId) =>
      resolveCanvasSessionNode(args.draftSession, args.canonicalNodesById, nodeId),
    projection: projectionResult.projection,
    outputs,
  });
  return persisted.outcome === 'rejected'
    ? persisted
    : {
        outcome: 'applied',
        draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, persisted.node),
      };
}

export function setCanvasColumnOutputIncluded(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  targetNodeId: string;
  columnId: string;
  columnType: string;
  output: boolean;
  placement?: Readonly<{ targetColumnId: string; placement: 'before' | 'after' }>;
}): CanvasColumnMappingResult {
  const targetNode = resolveCanvasSessionNode(
    args.draftSession,
    args.canonicalNodesById,
    args.targetNodeId
  );
  if (targetNode == null) return { outcome: 'rejected', reason: 'target_node_not_found' };
  const projectionResult = readEditableCanvasProjectionEntry({
    targetNode,
    edges: args.draftSession.workingSet.visibleEdges,
    resolveNode: (nodeId) =>
      resolveCanvasSessionNode(args.draftSession, args.canonicalNodesById, nodeId),
  });
  if (projectionResult.outcome === 'rejected') return projectionResult;
  const existingOutput = projectionResult.projection?.outputs.find(
    (candidate) => candidate.fieldId === args.columnId || candidate.name === args.columnId
  );
  if (args.output) {
    if (existingOutput != null) return { outcome: 'applied', draftSession: args.draftSession };
    const mapped = automapCanvasColumns({
      draftSession: args.draftSession,
      canonicalNodesById: args.canonicalNodesById,
      targetNodeId: targetNode.id,
      targetColumns: [{ name: args.columnId, type: args.columnType }],
    });
    if (mapped.outcome === 'rejected' || args.placement == null) {
      return mapped.outcome === 'rejected'
        ? mapped
        : { outcome: 'applied', draftSession: mapped.draftSession };
    }
    const mappedTargetNode = resolveCanvasSessionNode(
      mapped.draftSession,
      args.canonicalNodesById,
      targetNode.id
    );
    if (mappedTargetNode == null) return { outcome: 'rejected', reason: 'target_node_not_found' };
    const mappedProjection = readEditableCanvasProjectionEntry({
      targetNode: mappedTargetNode,
      edges: mapped.draftSession.workingSet.visibleEdges,
      resolveNode: (nodeId) =>
        resolveCanvasSessionNode(mapped.draftSession, args.canonicalNodesById, nodeId),
    });
    if (mappedProjection.outcome === 'rejected') return mappedProjection;
    const createdOutputs =
      mappedProjection.projection?.outputs.filter(
        (candidate) =>
          candidate.name === args.columnId && candidate.sourceFieldName === args.columnId
      ) ?? [];
    if (createdOutputs.length !== 1) return { outcome: 'rejected', reason: 'mapping_not_found' };
    return reorderCanvasColumnOutput({
      draftSession: mapped.draftSession,
      canonicalNodesById: args.canonicalNodesById,
      targetNodeId: targetNode.id,
      columnId: createdOutputs[0]!.fieldId,
      targetColumnId: args.placement.targetColumnId,
      placement: args.placement.placement,
    });
  }
  if (existingOutput?.sourceFieldName == null || projectionResult.projection == null) {
    return { outcome: 'rejected', reason: 'mapping_not_found' };
  }
  return removeCanvasColumnMapping({
    draftSession: args.draftSession,
    canonicalNodesById: args.canonicalNodesById,
    targetNode,
    outputId: existingOutput.fieldId,
    source: {
      nodeId: projectionResult.projection.source.nodeId,
      columnName: existingOutput.sourceFieldName,
    },
  });
}
