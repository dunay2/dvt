/** Owned concern: classify a cross-input column gesture as an ephemeral predicate seed. */
import { hasSameConnectionRef } from '@dvt/postgres-projection';

import type { CanonicalNode } from '../../types/canonical';
import type { CanvasDraftSession } from './canvasDraftSession';
import {
  resolveCanvasSessionNode,
  type CanvasColumnMappingTarget,
} from './canvasColumnMappingModel';
import {
  isSimpleCanvasPassthrough,
  readEditableCanvasProjectionEntry,
} from './canvasColumnProjectionAuthority';
import { readDvtSourceOutputProjection } from './canvasDvtSourceSemanticAuthoring';
import { canonicalizeDvtSubstraitProjectionDataType } from './canvasDvtSubstraitProjection';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';

export type CanvasRelationalOperandSeed = Readonly<{
  nodeId: string;
  fieldId: string;
  fieldName: string;
  dataType: string;
}>;

export type CanvasRelationalPredicateSeed = Readonly<{
  targetNodeId: string;
  left: CanvasRelationalOperandSeed;
  right: CanvasRelationalOperandSeed;
  candidateOperator: 'equal';
}>;

export function isCanvasRelationalPredicateSeedAvailable(
  inputs: readonly CanvasDvtCompositionInput[],
  seed: CanvasRelationalPredicateSeed
): boolean {
  if (seed.left.nodeId === seed.right.nodeId) return false;
  const leftInput = inputs.find((input) => input.nodeId === seed.left.nodeId);
  const rightInput = inputs.find((input) => input.nodeId === seed.right.nodeId);
  return (
    leftInput != null &&
    rightInput != null &&
    leftInput.sourceRef.connectionRef.provider === 'postgres' &&
    rightInput.sourceRef.connectionRef.provider === 'postgres' &&
    hasSameConnectionRef(leftInput.sourceRef.connectionRef, rightInput.sourceRef.connectionRef) &&
    seed.left.dataType === 'string' &&
    seed.right.dataType === 'string' &&
    leftInput.fields.some(
      (field) => field.name === seed.left.fieldName && field.stringCompatible
    ) &&
    rightInput.fields.some((field) => field.name === seed.right.fieldName && field.stringCompatible)
  );
}

function resolveSourceOperand(
  node: CanonicalNode,
  fieldIdentity: string
): CanvasRelationalOperandSeed | null {
  try {
    const projection = readDvtSourceOutputProjection(node);
    const output = projection?.outputs.find(
      (candidate) =>
        candidate.fieldId === fieldIdentity ||
        candidate.name === fieldIdentity ||
        candidate.sourceFieldName === fieldIdentity
    );
    const field = projection?.source.fields.find(
      (candidate) => candidate.name === output?.sourceFieldName
    );
    return output == null || field == null
      ? null
      : {
          nodeId: node.id,
          fieldId: output.fieldId,
          fieldName: field.name,
          dataType: canonicalizeDvtSubstraitProjectionDataType(field.dataType),
        };
  } catch {
    return null;
  }
}

export function resolveCanvasRelationalPredicateSeed(args: {
  draftSession: CanvasDraftSession;
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  source: Readonly<{ nodeId: string; columnId: string }>;
  target: CanvasColumnMappingTarget;
}): CanvasRelationalPredicateSeed | null {
  if (args.target.outputId == null) return null;
  const resolveNode = (nodeId: string): CanonicalNode | undefined =>
    resolveCanvasSessionNode(args.draftSession, args.canonicalNodesById, nodeId);
  const sourceNode = resolveNode(args.source.nodeId);
  const targetNode = resolveNode(args.target.nodeId);
  if (sourceNode == null || targetNode == null) return null;

  const projectionEntry = readEditableCanvasProjectionEntry({
    targetNode,
    edges: args.draftSession.workingSet.visibleEdges,
    resolveNode,
  });
  if (projectionEntry.outcome !== 'ready' || projectionEntry.projection == null) return null;
  const projection = projectionEntry.projection;
  if (projection.source.nodeId === sourceNode.id) return null;
  const output = projection.outputs.find((candidate) => candidate.fieldId === args.target.outputId);
  if (output == null || !isSimpleCanvasPassthrough(output) || output.sourceFieldName == null) {
    return null;
  }
  const leftNode = resolveNode(projection.source.nodeId);
  if (leftNode == null) return null;
  const dependencies = args.draftSession.workingSet.visibleEdges;
  if (
    !dependencies.some(
      (edge) => edge.sourceId === leftNode.id && edge.targetId === targetNode.id
    ) ||
    !dependencies.some((edge) => edge.sourceId === sourceNode.id && edge.targetId === targetNode.id)
  ) {
    return null;
  }
  const leftProjection = readDvtSourceOutputProjection(leftNode);
  const rightProjection = readDvtSourceOutputProjection(sourceNode);
  if (
    leftProjection == null ||
    rightProjection == null ||
    leftProjection.source.sourceRef.connectionRef.provider !== 'postgres' ||
    !hasSameConnectionRef(
      leftProjection.source.sourceRef.connectionRef,
      rightProjection.source.sourceRef.connectionRef
    )
  ) {
    return null;
  }
  const left = resolveSourceOperand(leftNode, output.sourceFieldName);
  const right = resolveSourceOperand(sourceNode, args.source.columnId);
  if (left?.dataType !== 'string' || right?.dataType !== 'string') return null;
  return {
    targetNodeId: targetNode.id,
    left,
    right,
    candidateOperator: 'equal',
  };
}
