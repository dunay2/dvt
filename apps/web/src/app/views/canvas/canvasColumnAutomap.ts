/** Owns deterministic type-compatible automapping across connected nodes. */
import type { CanonicalNode } from '../../types/canonical';
import { applyCanvasColumnMapping } from './canvasColumnMappingAuthoring';
import {
  resolveCanvasSessionNode,
  type CanvasColumn,
  type CanvasColumnAutomapResult,
} from './canvasColumnMappingModel';
import {
  readCanvasColumnMappingInputFields,
  readEditableCanvasProjectionEntry,
} from './canvasColumnProjectionAuthority';
import type { CanvasDraftSession } from './canvasDraftSession';

function normalizeKnownType(value: string | undefined): string | null {
  const normalized = value?.trim().toLowerCase().replaceAll(/\s+/g, ' ');
  if (normalized == null || normalized.length === 0 || normalized === 'unknown') return null;
  const aliases: Record<string, string> = {
    int: 'integer',
    int4: 'integer',
    int8: 'bigint',
    varchar: 'text',
    'character varying': 'text',
    bool: 'boolean',
  };
  return aliases[normalized] ?? normalized;
}

export function areCanvasColumnTypesCompatible(left: string, right: string): boolean {
  const normalizedLeft = normalizeKnownType(left);
  const normalizedRight = normalizeKnownType(right);
  return normalizedLeft != null && normalizedLeft === normalizedRight;
}

export function automapCanvasColumns(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  targetNodeId: string;
  targetColumns: readonly CanvasColumn[];
}): CanvasColumnAutomapResult {
  const targetNode = resolveCanvasSessionNode(
    args.draftSession,
    args.canonicalNodesById,
    args.targetNodeId
  );
  if (targetNode == null) return { outcome: 'rejected', reason: 'target_node_not_found' };
  const resolveNode = (nodeId: string): CanonicalNode | undefined =>
    resolveCanvasSessionNode(args.draftSession, args.canonicalNodesById, nodeId);
  const projectionResult = readEditableCanvasProjectionEntry({
    targetNode,
    edges: args.draftSession.workingSet.visibleEdges,
    resolveNode,
  });
  if (projectionResult.outcome === 'rejected') return projectionResult;
  const mappedProjection = projectionResult.projection;
  const mappedSourceNodeId = mappedProjection?.source.nodeId;
  const mappedSourceNode = mappedSourceNodeId == null ? undefined : resolveNode(mappedSourceNodeId);
  const mappedInputs = new Set(
    (mappedProjection?.outputs ?? []).flatMap((output) => {
      const columnId =
        mappedSourceNode?.pluginId === 'dvt' && mappedSourceNode.kind === 'dvt:transform'
          ? output.sourceFieldId
          : output.sourceFieldName;
      return columnId == null || mappedSourceNodeId == null
        ? []
        : [`${mappedSourceNodeId}\u0000${columnId}`];
    })
  );
  const upstreamNodes = args.draftSession.workingSet.visibleEdges
    .filter((edge) => edge.targetId === args.targetNodeId)
    .map((edge) => resolveNode(edge.sourceId))
    .filter((node): node is CanonicalNode => node != null);
  const candidates = upstreamNodes.flatMap((node) =>
    readCanvasColumnMappingInputFields({
      sourceNode: node,
      edges: args.draftSession.workingSet.visibleEdges,
      resolveNode,
    }).flatMap((column) =>
      mappedInputs.has(`${node.id}\u0000${column.columnId}`) ? [] : [{ node, column }]
    )
  );
  let draftSession = args.draftSession;
  let appliedCount = 0;

  for (const targetColumn of args.targetColumns) {
    const matches = candidates.filter(
      ({ column }) =>
        column.name === targetColumn.name &&
        areCanvasColumnTypesCompatible(column.dataType, targetColumn.type)
    );
    const match = matches.length === 1 ? matches[0] : undefined;
    if (match == null) continue;
    const result = applyCanvasColumnMapping({
      draftSession,
      canonicalNodesById: args.canonicalNodesById,
      source: { nodeId: match.node.id, columnId: match.column.columnId },
      target: {
        nodeId: args.targetNodeId,
        columnName: targetColumn.name,
        dataType: targetColumn.type,
      },
    });
    if (result.outcome === 'rejected') {
      if (result.reason === 'complex_expression_not_editable') continue;
      return result;
    }
    draftSession = result.draftSession;
    appliedCount += 1;
  }
  return appliedCount === 0
    ? { outcome: 'rejected', reason: 'no_compatible_mappings' }
    : {
        outcome: 'applied',
        draftSession,
        appliedCount,
        skippedCount: args.targetColumns.length - appliedCount,
      };
}
