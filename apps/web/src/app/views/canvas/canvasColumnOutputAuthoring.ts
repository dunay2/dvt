/** Owned concern: route Source publication and explicit structured-root edits without implicit model outputs. */
import type { CanonicalNode } from '../../types/canonical';
import {
  resolveCanvasSessionNode,
  type CanvasColumnMappingResult,
} from './canvasColumnMappingModel';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { decodeDvtSubstraitProjectionDocument } from './canvasDvtSubstraitProjection';
import { inspectDvtSubstraitStructuredFieldDraft } from './canvasDvtSubstraitStructuredField';
import {
  isDvtSourceOutputProjectionNode,
  reorderDvtSourceOutputs,
  setDvtSourceOutputIncluded,
} from './canvasDvtSourceSemanticAuthoring';
import { sourceOutputIsRequired } from './canvasSourceOutputDependencyPolicy';
import {
  reorderCanvasStructuredFieldRoots,
  setCanvasStructuredRootOutputIncluded,
} from './canvasStructuredFieldRootAuthoring';

type OutputCommandContext = Readonly<{
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  targetNodeId: string;
  columnId: string;
}>;

function hasStructuredOutput(node: CanonicalNode): boolean {
  try {
    const authority = readDvtTransformAuthoringAuthority(node);
    if (authority == null) return false;
    const inspection = inspectDvtSubstraitStructuredFieldDraft(
      decodeDvtSubstraitProjectionDocument(authority.semanticDocument)
    );
    return inspection.ok && inspection.fields.some((field) => field.children != null);
  } catch {
    return false;
  }
}

export function reorderCanvasColumnOutput(
  args: OutputCommandContext &
    Readonly<{
      targetColumnId: string;
      placement: 'before' | 'after';
    }>
): CanvasColumnMappingResult {
  const targetNode = resolveCanvasSessionNode(
    args.draftSession,
    args.canonicalNodesById,
    args.targetNodeId
  );
  if (targetNode == null) return { outcome: 'rejected', reason: 'target_node_not_found' };
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
  if (!hasStructuredOutput(targetNode))
    return { outcome: 'rejected', reason: 'invalid_transform_authority' };
  const result = reorderCanvasStructuredFieldRoots({
    draftSession: args.draftSession,
    canonicalNodesById: args.canonicalNodesById,
    nodeId: args.targetNodeId,
    fieldId: args.columnId,
    targetFieldId: args.targetColumnId,
    placement: args.placement,
  });
  return result.outcome === 'applied'
    ? result
    : { outcome: 'rejected', reason: 'mapping_not_found' };
}

export function setCanvasColumnOutputIncluded(
  args: OutputCommandContext &
    Readonly<{
      output: boolean;
      placement?: Readonly<{ targetColumnId: string; placement: 'before' | 'after' }>;
    }>
): CanvasColumnMappingResult {
  const targetNode = resolveCanvasSessionNode(
    args.draftSession,
    args.canonicalNodesById,
    args.targetNodeId
  );
  if (targetNode == null) return { outcome: 'rejected', reason: 'target_node_not_found' };
  if (isDvtSourceOutputProjectionNode(targetNode)) {
    if (
      !args.output &&
      sourceOutputIsRequired({
        draftSession: args.draftSession,
        canonicalNodesById: args.canonicalNodesById,
        sourceNode: targetNode,
        columnName: args.columnId,
      })
    )
      return { outcome: 'rejected', reason: 'source_output_required' };
    const result = setDvtSourceOutputIncluded(
      targetNode,
      args.columnId,
      args.output,
      args.placement
    );
    if (result.outcome === 'rejected')
      return {
        outcome: 'rejected',
        reason:
          result.reason === 'last_source_output'
            ? 'source_output_last_field'
            : 'invalid_transform_authority',
      };
    return {
      outcome: 'applied',
      draftSession: canvasDraftSession.workingSet.upsertNode(args.draftSession, result.node),
    };
  }
  if (!hasStructuredOutput(targetNode))
    return { outcome: 'rejected', reason: 'invalid_transform_authority' };
  const result = setCanvasStructuredRootOutputIncluded({
    draftSession: args.draftSession,
    canonicalNodesById: args.canonicalNodesById,
    nodeId: args.targetNodeId,
    columnId: args.columnId,
    output: args.output,
    ...(args.placement == null ? {} : { placement: args.placement }),
  });
  return result.outcome === 'applied'
    ? result
    : { outcome: 'rejected', reason: 'mapping_not_found' };
}
