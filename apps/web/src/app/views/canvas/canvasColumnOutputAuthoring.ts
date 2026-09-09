/** Owns output inclusion and ordering for canonical Transform projections. */
import type { CanonicalNode } from '../../types/canonical';
import { automapCanvasColumns } from './canvasColumnAutomap';
import { resolveCanvasDraftNodes } from './canvasDraftNodeCatalog';
import {
  applyCanvasColumnMapping,
  removeCanvasColumnMapping,
} from './canvasColumnMappingAuthoring';
import {
  resolveCanvasSessionNode,
  type CanvasColumnMappingResult,
} from './canvasColumnMappingModel';
import {
  readCanvasColumnMappingInputFields,
  readEditableCanvasProjectionEntry,
} from './canvasColumnProjectionAuthority';
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
import { projectCanvasNodePresentationTruth } from './canvasNodePresentationProjection';
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
  if (projectionResult.projection == null) {
    const nodes = resolveCanvasDraftNodes(args.draftSession, args.canonicalNodesById);
    const declaredColumns = projectCanvasNodePresentationTruth({
      node: targetNode,
      nodes,
      edges: args.draftSession.workingSet.visibleEdges,
    }).columns.visible.filter((column) => column.provenance === 'declared');
    if (declaredColumns.length > 0) {
      const materialized = automapCanvasColumns({
        draftSession: args.draftSession,
        canonicalNodesById: args.canonicalNodesById,
        targetNodeId: args.targetNodeId,
        targetColumns: declaredColumns.map((column) => ({ name: column.name, type: column.type })),
      });
      if (materialized.outcome === 'rejected') return materialized;
      if (materialized.appliedCount !== declaredColumns.length) {
        return { outcome: 'rejected', reason: 'mapping_not_found' };
      }
      const materializedNode = resolveCanvasSessionNode(
        materialized.draftSession,
        args.canonicalNodesById,
        args.targetNodeId
      );
      if (materializedNode == null) {
        return { outcome: 'rejected', reason: 'target_node_not_found' };
      }
      const materializedProjection = readEditableCanvasProjectionEntry({
        targetNode: materializedNode,
        edges: materialized.draftSession.workingSet.visibleEdges,
        resolveNode: (nodeId) =>
          resolveCanvasSessionNode(materialized.draftSession, args.canonicalNodesById, nodeId),
      });
      if (materializedProjection.outcome === 'rejected') return materializedProjection;
      const materializedOutput = materializedProjection.projection?.outputs.find(
        (candidate) => candidate.fieldId === args.columnId || candidate.name === args.columnId
      );
      return setCanvasColumnOutputIncluded({
        ...args,
        draftSession: materialized.draftSession,
        ...(materializedOutput == null ? {} : { columnId: materializedOutput.fieldId }),
      });
    }
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
    const resolveNode = (nodeId: string): CanonicalNode | undefined =>
      resolveCanvasSessionNode(args.draftSession, args.canonicalNodesById, nodeId);
    const matchingInputs = args.draftSession.workingSet.visibleEdges
      .filter((edge) => edge.targetId === targetNode.id)
      .flatMap((edge) => {
        const sourceNode = resolveNode(edge.sourceId);
        if (sourceNode == null) return [];
        return readCanvasColumnMappingInputFields({
          sourceNode,
          edges: args.draftSession.workingSet.visibleEdges,
          resolveNode,
        }).flatMap((field) => (field.columnId === args.columnId ? [{ sourceNode, field }] : []));
      });
    if (matchingInputs.length !== 1) {
      return { outcome: 'rejected', reason: 'mapping_not_found' };
    }
    const selectedInput = matchingInputs[0]!;
    const mapped = applyCanvasColumnMapping({
      draftSession: args.draftSession,
      canonicalNodesById: args.canonicalNodesById,
      source: { nodeId: selectedInput.sourceNode.id, columnId: selectedInput.field.columnId },
      target: {
        nodeId: targetNode.id,
        columnName: selectedInput.field.name,
        dataType: selectedInput.field.dataType,
      },
    });
    if (mapped.outcome === 'rejected' || args.placement == null) {
      return mapped;
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
          candidate.sourceFieldName === selectedInput.field.name &&
          (selectedInput.sourceNode.kind !== 'dvt:transform' ||
            candidate.sourceFieldId === selectedInput.field.columnId)
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
      columnId:
        resolveCanvasSessionNode(
          args.draftSession,
          args.canonicalNodesById,
          projectionResult.projection.source.nodeId
        )?.kind === 'dvt:transform'
          ? (existingOutput.sourceFieldId ?? existingOutput.sourceFieldName)
          : existingOutput.sourceFieldName,
    },
  });
}
