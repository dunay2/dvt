/** Owns deterministic type-compatible automapping across connected nodes. */
import type { CanonicalNode } from '../../types/canonical';
import { applyCanvasColumnMapping } from './canvasColumnMappingAuthoring';
import {
  readCanvasNodeColumns,
  resolveCanvasSessionNode,
  type CanvasColumn,
  type CanvasColumnAutomapResult,
} from './canvasColumnMappingModel';
import { readEditableCanvasProjectionEntry } from './canvasColumnProjectionAuthority';
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
  const projectionResult = readEditableCanvasProjectionEntry({
    targetNode,
    edges: args.draftSession.workingSet.visibleEdges,
    resolveNode: (nodeId) =>
      resolveCanvasSessionNode(args.draftSession, args.canonicalNodesById, nodeId),
  });
  if (projectionResult.outcome === 'rejected') return projectionResult;
  const mappedInputs = new Set(
    (projectionResult.projection?.outputs ?? []).flatMap((output) =>
      output.sourceFieldName == null || projectionResult.projection == null
        ? []
        : [`${projectionResult.projection.source.nodeId}\u0000${output.sourceFieldName}`]
    )
  );
  const upstreamNodes = args.draftSession.workingSet.visibleEdges
    .filter((edge) => edge.targetId === args.targetNodeId)
    .map((edge) =>
      resolveCanvasSessionNode(args.draftSession, args.canonicalNodesById, edge.sourceId)
    )
    .filter((node): node is CanonicalNode => node != null);
  const candidates = upstreamNodes.flatMap((node) =>
    readCanvasNodeColumns(node).flatMap((column) =>
      mappedInputs.has(`${node.id}\u0000${column.name}`) ? [] : [{ node, column }]
    )
  );
  let draftSession = args.draftSession;
  let appliedCount = 0;

  for (const targetColumn of args.targetColumns) {
    const matches = candidates.filter(
      ({ column }) =>
        column.name === targetColumn.name &&
        areCanvasColumnTypesCompatible(column.type, targetColumn.type)
    );
    const match = matches.length === 1 ? matches[0] : undefined;
    if (match == null) continue;
    const result = applyCanvasColumnMapping({
      draftSession,
      canonicalNodesById: args.canonicalNodesById,
      source: { nodeId: match.node.id, columnName: match.column.name },
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
