import { jcsCanonicalize } from '@dvt/crypto';

import { resolveEffectiveDvtConnectionRef } from './canvasDvtAuthoringModel';
import type {
  TransformationGraphValidationResult,
  TransformationGraphValidationSummaryCode,
  TransformationNodeRole,
  TransformationValidationContext,
} from './transformationGraphValidation.types';

function buildDraftSignature(
  allNodes: TransformationValidationContext['allNodes'],
  allEdges: TransformationValidationContext['allEdges'],
  scopedNodeIds: readonly string[]
): string {
  const scopedIds = new Set(scopedNodeIds);
  return jcsCanonicalize({
    nodes: allNodes
      .filter((node) => scopedIds.has(node.id))
      .map((node) => ({
        id: node.id,
        kind: node.kind,
        role: node.role,
        name: node.name,
        ...(node.path ? { path: node.path } : {}),
        ...(node.kind === 'dvt:source'
          ? { connectionRef: resolveEffectiveDvtConnectionRef(node) }
          : {}),
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    edges: allEdges
      .filter((edge) => scopedIds.has(edge.sourceId) && scopedIds.has(edge.targetId))
      .map((edge) => ({ id: edge.id, sourceId: edge.sourceId, targetId: edge.targetId }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  });
}

export function buildInvalidResult(
  summaryCode: Exclude<TransformationGraphValidationSummaryCode, 'valid'>,
  context: Pick<TransformationValidationContext, 'allNodes' | 'allEdges'>,
  scopedNodeIds: readonly string[],
  scopedEdgeIds: readonly string[] = []
): TransformationGraphValidationResult {
  return {
    valid: false,
    summaryCode,
    draftSignature: buildDraftSignature(context.allNodes, context.allEdges, scopedNodeIds),
    scopedNodeIds,
    scopedEdgeIds,
    nodeRolesById: {},
  };
}

export function buildContextInvalidResult(
  context: TransformationValidationContext,
  summaryCode: Exclude<TransformationGraphValidationSummaryCode, 'valid'>
): TransformationGraphValidationResult {
  return buildInvalidResult(summaryCode, context, context.scopedNodeIds, context.scopedEdgeIds);
}

export function buildValidResult(
  context: TransformationValidationContext,
  nodeRolesById: Record<string, TransformationNodeRole>
): TransformationGraphValidationResult {
  return {
    valid: true,
    summaryCode: 'valid',
    draftSignature: buildDraftSignature(context.allNodes, context.allEdges, context.scopedNodeIds),
    scopedNodeIds: context.scopedNodeIds,
    scopedEdgeIds: context.scopedEdgeIds,
    nodeRolesById,
  };
}
