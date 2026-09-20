/** Owned concern: project canonical dependency edges into React Flow viewport state. */
import type { Edge } from '@xyflow/react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveGraphNodeCardCopy } from '../../plugins/graph/graphNodeCardCopyTokens';
import { resolveCanvasAuthoringVisibleEdgeId } from './canvasAuthoringGraphProjection';
import { resolveCanvasViewCopy } from './canvasCopyCatalog';
import type { CanvasDraftEdge } from './canvasDraftSession';
import {
  buildCanvasDependencyEdgeData,
  readCanvasDependencyEdgeData,
} from './canvasDependencyEdgeModel';
import { createCanvasDirectionalEdge } from './canvasNodeMapper';
import {
  resolveCanvasRelationalCompositionEdgeMembers,
  type CanvasRelationalCompositionEdgeMember,
} from './canvasRelationalCompositionEdgeGroup';
import { resolveCanvasRelationalCompositionBadgeSummary } from './canvasRelationalCompositionBadgeSummary';

function resolveCompositionLabel(
  member: CanvasRelationalCompositionEdgeMember,
  locale: string
): string {
  const cardCopy = resolveGraphNodeCardCopy(locale);
  if (member.state === 'incomplete' || member.state === 'unresolved') {
    return cardCopy.relationalCompositionIncompleteLabel;
  }
  const operationLabel =
    member.operation === 'inner_join'
      ? 'INNER JOIN'
      : member.operation === 'left_join'
        ? 'LEFT JOIN'
        : member.operation === 'right_join'
          ? 'RIGHT JOIN'
          : member.operation === 'full_outer_join'
            ? 'FULL OUTER JOIN'
            : member.operation === 'left_semi_join'
              ? 'LEFT SEMI JOIN'
              : member.operation === 'left_anti_join'
                ? 'LEFT ANTI JOIN'
                : member.operation === 'right_semi_join'
                  ? 'RIGHT SEMI JOIN'
                  : member.operation === 'right_anti_join'
                    ? 'RIGHT ANTI JOIN'
                    : member.operation === 'cross_join'
                      ? 'CROSS JOIN'
                      : member.operation === 'union_all'
                        ? 'UNION ALL'
                        : member.operation === 'union_distinct'
                          ? 'UNION DISTINCT'
                          : member.operation === 'intersect_distinct'
                            ? 'INTERSECT'
                            : member.operation === 'except_distinct'
                              ? 'EXCEPT'
                              : null;
  if (member.state === 'canonical') {
    return operationLabel ?? cardCopy.relationalCompositionIncompleteLabel;
  }
  return operationLabel == null
    ? cardCopy.relationalCompositionPendingLabel
    : `${operationLabel} + ${cardCopy.relationalCompositionPendingLabel}`;
}

export function projectCanvasViewportEdges(args: {
  visibleEdges: readonly CanvasDraftEdge[];
  allowedNodeIds: ReadonlySet<string>;
  canonicalEdgeIdBySignature: ReadonlyMap<string, string>;
  canonicalEdgeBySignature: ReadonlyMap<string, CanonicalEdge>;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  locale: string;
}): Edge[] {
  const {
    visibleEdges,
    allowedNodeIds,
    canonicalEdgeIdBySignature,
    canonicalEdgeBySignature,
    canonicalNodesById,
    locale,
  } = args;
  const copy = resolveCanvasViewCopy(locale);
  const compositionMembers = resolveCanvasRelationalCompositionEdgeMembers({
    nodes: [...canonicalNodesById.values()],
    edges: visibleEdges,
  });

  return visibleEdges
    .filter((edge) => allowedNodeIds.has(edge.sourceId) && allowedNodeIds.has(edge.targetId))
    .map((edge) => {
      const canonicalEdge = canonicalEdgeBySignature.get(`${edge.sourceId}::${edge.targetId}`);
      const compositionMember = compositionMembers.get(`${edge.sourceId}::${edge.targetId}`);
      const compositionLabel =
        compositionMember == null ? null : resolveCompositionLabel(compositionMember, locale);
      const compositionTarget = canonicalNodesById.get(edge.targetId);
      const compositionAccessibleLabel =
        compositionMember?.state === 'canonical' &&
        compositionMember.operation != null &&
        compositionTarget != null
          ? resolveCanvasRelationalCompositionBadgeSummary({
              node: compositionTarget,
              operation: compositionMember.operation,
              locale,
            })
          : null;
      const data = buildCanvasDependencyEdgeData({
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        executionGate: edge.executionGate,
        canonicalMetadata: canonicalEdge?.metadata,
        ...(compositionMember == null
          ? {}
          : {
              composition: {
                ...compositionMember,
                label: compositionLabel!,
                ...(compositionAccessibleLabel == null
                  ? {}
                  : { accessibleLabel: compositionAccessibleLabel }),
              },
            }),
      });
      const baseAriaLabel = copy.canvasEdgeAccessibleLabelTemplate
        .replace('{source}', canonicalNodesById.get(edge.sourceId)?.name ?? edge.sourceId)
        .replace('{target}', canonicalNodesById.get(edge.targetId)?.name ?? edge.targetId);
      const compositionAriaLabel =
        data.composition == null
          ? baseAriaLabel
          : `${baseAriaLabel}, ${data.composition.accessibleLabel ?? data.composition.label}`;

      return createCanvasDirectionalEdge({
        id: resolveCanvasAuthoringVisibleEdgeId({ edge, canonicalEdgeIdBySignature }),
        source: edge.sourceId,
        target: edge.targetId,
        ariaLabel:
          data.execution.gateState === 'closed'
            ? `${compositionAriaLabel}, ${copy.canvasEdgeExcludedFromExecutionLabel}`
            : compositionAriaLabel,
        data,
      });
    });
}

function viewportEdgeEqual(left: Edge, right: Edge): boolean {
  return (
    left.id === right.id &&
    left.source === right.source &&
    left.target === right.target &&
    left.ariaLabel === right.ariaLabel &&
    JSON.stringify(readCanvasDependencyEdgeData(left.data)) ===
      JSON.stringify(readCanvasDependencyEdgeData(right.data))
  );
}

export function canvasViewportEdgesEqual(left: Edge[], right: Edge[]): boolean {
  return (
    left.length === right.length &&
    left.every((edge, index) => viewportEdgeEqual(edge, right[index]!))
  );
}
