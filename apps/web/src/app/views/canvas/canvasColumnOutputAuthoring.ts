/** Owns output inclusion and ordering for canonical Transform projections. */
import type { CanonicalNode } from '../../types/canonical';
import { automapCanvasColumns } from './canvasColumnAutomap';
import { removeCanvasColumnMapping } from './canvasColumnMappingAuthoring';
import {
  resolveCanvasSessionNode,
  type CanvasColumnMappingResult,
} from './canvasColumnMappingModel';
import { readEditableCanvasProjectionEntry } from './canvasColumnProjectionAuthority';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import {
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
  reorderDvtSubstraitProjectionOutputs,
} from './canvasDvtSubstraitProjection';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import {
  reorderCanvasStructuredFieldRoots,
  setCanvasStructuredRootOutputIncluded,
} from './canvasStructuredFieldRootAuthoring';

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
  if (projectionResult.outcome === 'rejected') {
    const structuredResult = reorderCanvasStructuredFieldRoots({
      draftSession: args.draftSession,
      canonicalNodesById: args.canonicalNodesById,
      nodeId: args.targetNodeId,
      fieldId: args.columnId,
      targetFieldId: args.targetColumnId,
      placement: args.placement,
    });
    return structuredResult.outcome === 'applied'
      ? structuredResult
      : { outcome: 'rejected', reason: 'mapping_not_found' };
  }
  if (projectionResult.projection == null) {
    return { outcome: 'rejected', reason: 'mapping_not_found' };
  }
  const authority = readDvtTransformAuthoringAuthority(targetNode);
  if (authority == null) return { outcome: 'rejected', reason: 'mapping_not_found' };
  try {
    const currentDraft = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
    const reorderedDraft = reorderDvtSubstraitProjectionOutputs(currentDraft, {
      fieldId: args.columnId,
      targetFieldId: args.targetColumnId,
      placement: args.placement,
    });
    if (reorderedDraft === currentDraft) {
      return { outcome: 'rejected', reason: 'mapping_not_found' };
    }
    const node = applyDvtSubstraitSemanticDocument(
      targetNode,
      encodeDvtSubstraitProjectionDocument(reorderedDraft)
    );
    return {
      outcome: 'applied',
      draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, node),
    };
  } catch {
    return { outcome: 'rejected', reason: 'mapping_not_found' };
  }
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
  if (projectionResult.outcome === 'rejected') {
    const structuredResult = setCanvasStructuredRootOutputIncluded({
      draftSession: args.draftSession,
      canonicalNodesById: args.canonicalNodesById,
      nodeId: args.targetNodeId,
      columnId: args.columnId,
      output: args.output,
      ...(args.placement == null ? {} : { placement: args.placement }),
    });
    return structuredResult.outcome === 'applied'
      ? structuredResult
      : { outcome: 'rejected', reason: 'mapping_not_found' };
  }
  const existingOutput = projectionResult.projection?.outputs.find(
    (candidate) => candidate.fieldId === args.columnId
  );
  if (
    existingOutput == null &&
    projectionResult.projection?.outputs.some((candidate) => candidate.name === args.columnId)
  ) {
    return { outcome: 'rejected', reason: 'mapping_not_found' };
  }
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
