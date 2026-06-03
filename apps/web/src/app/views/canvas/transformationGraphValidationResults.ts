import { buildPreviewGraphSignature } from './previewGraphSource';
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
  return buildPreviewGraphSignature(allNodes, allEdges, scopedNodeIds);
}

export function buildInvalidResult(
  summaryCode: Exclude<TransformationGraphValidationSummaryCode, 'valid'>,
  context: Pick<TransformationValidationContext, 'allNodes' | 'allEdges'>,
  scopedNodeIds: string[],
  scopedEdgeIds: string[] = []
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
  return buildInvalidResult(
    summaryCode,
    context,
    context.scopedNodeIds,
    context.scopedEdgeIds
  );
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
