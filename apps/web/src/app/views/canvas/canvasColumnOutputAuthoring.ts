/** Owns output inclusion and ordering for canonical Transform projections. */
import type { CanonicalNode } from '../../types/canonical';
import { automapCanvasColumns } from './canvasColumnAutomap';
import {
  applyCanvasColumnMapping,
  removeCanvasColumnMapping,
} from './canvasColumnMappingAuthoring';
import {
  readCanvasNodeColumns,
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
import {
  isDvtSourceOutputProjectionNode,
  reorderDvtSourceOutputs,
  setDvtSourceOutputIncluded,
} from './canvasDvtSourceSemanticAuthoring';
import { sourceOutputIsRequired } from './canvasSourceOutputDependencyPolicy';
import {
  reorderCanvasJoinColumnOutput,
  setCanvasJoinColumnOutputIncluded,
} from './canvasJoinColumnOutputAuthoring';
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
  const joinResult = reorderCanvasJoinColumnOutput({ ...args, targetNode });
  if (joinResult != null) return joinResult;
  if (isDvtSourceOutputProjectionNode(targetNode)) {
    const result = reorderDvtSourceOutputs(
      targetNode,
      args.columnId,
      args.targetColumnId,
      args.placement
    );
    return result.outcome === 'rejected'
      ? { outcome: 'rejected', reason: 'invalid_transform_authority' }
      : {
          outcome: 'applied',
          draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, result.node),
        };
  }
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
  source?: Readonly<{ nodeId: string; columnId: string }>;
  placement?: Readonly<{ targetColumnId: string; placement: 'before' | 'after' }>;
}): CanvasColumnMappingResult {
  const targetNode = resolveCanvasSessionNode(
    args.draftSession,
    args.canonicalNodesById,
    args.targetNodeId
  );
  if (targetNode == null) return { outcome: 'rejected', reason: 'target_node_not_found' };
  const joinResult = setCanvasJoinColumnOutputIncluded({ ...args, targetNode });
  if (joinResult != null) return joinResult;
  if (isDvtSourceOutputProjectionNode(targetNode)) {
    if (
      !args.output &&
      sourceOutputIsRequired({
        draftSession: args.draftSession,
        canonicalNodesById: args.canonicalNodesById,
        sourceNode: targetNode,
        columnName: args.columnId,
      })
    ) {
      return { outcome: 'rejected', reason: 'source_output_required' };
    }
    const result = setDvtSourceOutputIncluded(
      targetNode,
      args.columnId,
      args.output,
      args.placement
    );
    if (result.outcome === 'rejected') {
      return {
        outcome: 'rejected',
        reason:
          result.reason === 'last_source_output'
            ? 'source_output_last_field'
            : 'invalid_transform_authority',
      };
    }
    return {
      outcome: 'applied',
      draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, result.node),
    };
  }
  const projectionResult = readEditableCanvasProjectionEntry({
    targetNode,
    edges: args.draftSession.workingSet.visibleEdges,
    resolveNode: (nodeId) =>
      resolveCanvasSessionNode(args.draftSession, args.canonicalNodesById, nodeId),
  });
  if (
    projectionResult.outcome === 'rejected' ||
    (!args.output &&
      projectionResult.projection != null &&
      resolveCanvasSessionNode(
        args.draftSession,
        args.canonicalNodesById,
        projectionResult.projection.source.nodeId
      )?.kind !== 'dvt:transform')
  ) {
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
    const declaredColumns = readCanvasNodeColumns(targetNode);
    if (declaredColumns.length > 0) {
      const materialized = automapCanvasColumns({
        draftSession: args.draftSession,
        canonicalNodesById: args.canonicalNodesById,
        targetNodeId: args.targetNodeId,
        targetColumns: declaredColumns,
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
      .filter(
        (edge) =>
          edge.targetId === targetNode.id &&
          (args.source == null || edge.sourceId === args.source.nodeId)
      )
      .flatMap((edge) => {
        const sourceNode = resolveNode(edge.sourceId);
        if (sourceNode == null) return [];
        return readCanvasColumnMappingInputFields({
          sourceNode,
          edges: args.draftSession.workingSet.visibleEdges,
          resolveNode,
        }).flatMap((field) =>
          field.columnId === (args.source?.columnId ?? args.columnId) ? [{ sourceNode, field }] : []
        );
      });
    if (matchingInputs.length !== 1) {
      return { outcome: 'rejected', reason: 'mapping_not_found' };
    }
    const selectedInput = matchingInputs[0]!;
    if (
      projectionResult.projection != null &&
      selectedInput.sourceNode.kind !== 'dvt:transform' &&
      selectedInput.sourceNode.id === projectionResult.projection.source.nodeId
    ) {
      const restored = setCanvasStructuredRootOutputIncluded({
        draftSession: args.draftSession,
        canonicalNodesById: args.canonicalNodesById,
        nodeId: targetNode.id,
        columnId: selectedInput.field.name,
        output: true,
        ...(args.placement == null ? {} : { placement: args.placement }),
      });
      return restored.outcome === 'applied'
        ? restored
        : { outcome: 'rejected', reason: 'mapping_not_found' };
    }
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
      columnId: existingOutput.sourceFieldId ?? existingOutput.sourceFieldName,
    },
  });
}
