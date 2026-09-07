/** Translates one column-mapping intent into the canonical Transform authority. */
import { allocateDvtFieldId } from '@dvt/contracts';

import type { CanonicalNode } from '../../types/canonical';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import {
  hasCanvasStageDependency,
  readCanvasNodeColumns,
  resolveCanvasSessionNode,
  type CanvasColumnMappingResult,
  type CanvasColumnMappingSource,
  type CanvasColumnMappingTarget,
} from './canvasColumnMappingModel';
import {
  isSimpleCanvasPassthrough,
  persistCanvasProjectionOutputs,
  readEditableCanvasProjectionEntry,
  type EditableCanvasProjectionEntry,
} from './canvasColumnProjectionAuthority';
import type { DvtSubstraitProjectionOutput } from './canvasDvtSubstraitProjection';

function readProjectionEntry(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  targetNode: CanonicalNode;
}): EditableCanvasProjectionEntry {
  return readEditableCanvasProjectionEntry({
    targetNode: args.targetNode,
    edges: args.draftSession.workingSet.visibleEdges,
    resolveNode: (nodeId) =>
      resolveCanvasSessionNode(args.draftSession, args.canonicalNodesById, nodeId),
  });
}

export function applyCanvasColumnMapping(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  source: CanvasColumnMappingSource;
  target: CanvasColumnMappingTarget;
}): CanvasColumnMappingResult {
  const sourceNode = resolveCanvasSessionNode(
    args.draftSession,
    args.canonicalNodesById,
    args.source.nodeId
  );
  if (sourceNode == null) return { outcome: 'rejected', reason: 'source_node_not_found' };
  const targetNode = resolveCanvasSessionNode(
    args.draftSession,
    args.canonicalNodesById,
    args.target.nodeId
  );
  if (targetNode == null) return { outcome: 'rejected', reason: 'target_node_not_found' };
  if (!hasCanvasStageDependency(args.draftSession, sourceNode.id, targetNode.id)) {
    return { outcome: 'rejected', reason: 'source_not_connected' };
  }
  const sourceColumn = readCanvasNodeColumns(sourceNode).find(
    (column) => column.name === args.source.columnName
  );
  if (sourceColumn == null) return { outcome: 'rejected', reason: 'source_column_not_found' };

  const projectionResult = readProjectionEntry({
    draftSession: args.draftSession,
    canonicalNodesById: args.canonicalNodesById,
    targetNode,
  });
  if (projectionResult.outcome === 'rejected') return projectionResult;
  if (
    projectionResult.projection != null &&
    projectionResult.projection.source.nodeId !== sourceNode.id &&
    (projectionResult.projection.outputs.length !== 1 || args.target.outputId == null)
  ) {
    return { outcome: 'rejected', reason: 'projection_requires_one_connected_source' };
  }
  const outputs = projectionResult.projection?.outputs ?? [];
  if (
    args.target.outputId == null &&
    outputs.some((output) => output.name === args.target.columnName)
  ) {
    return { outcome: 'rejected', reason: 'mapping_not_found' };
  }
  const outputIndex =
    args.target.outputId == null
      ? -1
      : outputs.findIndex((output) => output.fieldId === args.target.outputId);
  if (args.target.outputId != null && outputIndex < 0) {
    return { outcome: 'rejected', reason: 'mapping_not_found' };
  }
  const currentOutput = outputs[outputIndex];
  if (currentOutput != null && !isSimpleCanvasPassthrough(currentOutput)) {
    return { outcome: 'rejected', reason: 'complex_expression_not_editable' };
  }

  const nextOutput: DvtSubstraitProjectionOutput = {
    fieldId: currentOutput?.fieldId ?? allocateDvtFieldId(),
    name: currentOutput?.name ?? args.target.columnName,
    sourceFieldName: args.source.columnName,
    dataType: currentOutput?.dataType ?? args.target.dataType ?? sourceColumn.type,
    outputOrdinal: currentOutput?.outputOrdinal ?? outputs.length,
    ...(currentOutput?.description == null ? {} : { description: currentOutput.description }),
  };
  const nextOutputs = [...outputs];
  if (outputIndex < 0) nextOutputs.push(nextOutput);
  else nextOutputs[outputIndex] = nextOutput;
  const persisted = persistCanvasProjectionOutputs({
    targetNode,
    resolveNode: (nodeId) =>
      resolveCanvasSessionNode(args.draftSession, args.canonicalNodesById, nodeId),
    projection: projectionResult.projection,
    outputs: nextOutputs,
    sourceNodeIdHint: args.source.nodeId,
  });
  if (persisted.outcome === 'rejected') return persisted;
  return {
    outcome: 'applied',
    draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, persisted.node),
  };
}

export function removeCanvasColumnMapping(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  targetNode: CanonicalNode;
  outputId: string;
  source: CanvasColumnMappingSource;
}): CanvasColumnMappingResult {
  const projectionResult = readProjectionEntry({
    draftSession: args.draftSession,
    canonicalNodesById: args.canonicalNodesById,
    targetNode: args.targetNode,
  });
  if (projectionResult.outcome === 'rejected') return projectionResult;
  if (projectionResult.projection == null) {
    return { outcome: 'rejected', reason: 'mapping_not_found' };
  }
  const outputIndex = projectionResult.projection.outputs.findIndex(
    (output) => output.fieldId === args.outputId
  );
  const output = projectionResult.projection.outputs[outputIndex];
  if (
    output?.sourceFieldName == null ||
    projectionResult.projection.source.nodeId !== args.source.nodeId ||
    output.sourceFieldName !== args.source.columnName
  ) {
    return { outcome: 'rejected', reason: 'mapping_not_found' };
  }
  const persisted = persistCanvasProjectionOutputs({
    targetNode: args.targetNode,
    resolveNode: (nodeId) =>
      resolveCanvasSessionNode(args.draftSession, args.canonicalNodesById, nodeId),
    sourceNodeIdHint: args.source.nodeId,
    projection: projectionResult.projection,
    outputs: projectionResult.projection.outputs.filter((_, index) => index !== outputIndex),
  });
  if (persisted.outcome === 'rejected') return persisted;
  return {
    outcome: 'applied',
    draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, persisted.node),
  };
}
