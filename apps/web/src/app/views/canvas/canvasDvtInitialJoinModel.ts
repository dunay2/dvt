/** Owned concern: select and build one typed initial JOIN draft. */
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { hasSameConnectionRef, type DvtSubstraitJoinType } from '@dvt/postgres-projection';

import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { createSourceJoin } from './canvasSourceJoin';
import { toSourceRelationInput, canvasInputConnection } from './canvasSourceRelation';
import { canvasInputRequiresProjection } from './canvasInputComposition';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import {
  hasCompatibleCanvasDvtJoinFields,
  resolveCanvasDvtJoinFieldPair,
} from './canvasDvtJoinTypeAdmission';

export type CanvasDvtInitialJoinPair = Readonly<{
  leftNodeId: string;
  rightNodeId: string;
  leftFieldName: string;
  rightFieldName: string;
}>;

export function resolveCanvasDvtInitialJoinPairForInputs(
  left: CanvasDvtCompositionInput,
  right: CanvasDvtCompositionInput
): CanvasDvtInitialJoinPair | null {
  if (canvasInputRequiresProjection(left) || canvasInputRequiresProjection(right)) return null;
  if (!(
    canvasInputConnection(left).provider === 'postgres' &&
    canvasInputConnection(right).provider === 'postgres' &&
    hasSameConnectionRef(canvasInputConnection(left), canvasInputConnection(right)) &&
    [...left.fields, ...right.fields].every((field) => field.joinDataType != null) &&
    hasCompatibleCanvasDvtJoinFields(left.fields, right.fields)
  )) {
    return null;
  }
  const pair = resolveCanvasDvtJoinFieldPair(left.fields, right.fields);
  return pair == null
    ? null
    : {
        leftNodeId: left.nodeId,
        rightNodeId: right.nodeId,
        leftFieldName: pair.left.name,
        rightFieldName: pair.right.name,
      };
}

export function resolveCanvasDvtInitialJoinInputs(
  inputs: readonly CanvasDvtCompositionInput[]
): readonly CanvasDvtCompositionInput[] {
  return inputs.filter((left) =>
    inputs.some((right) => resolveCanvasDvtInitialJoinPairForInputs(left, right) != null)
  );
}

export function resolveCanvasDvtInitialJoinPair(
  inputs: readonly CanvasDvtCompositionInput[]
): CanvasDvtInitialJoinPair | null {
  if (inputs.length !== 2) return null;
  return resolveCanvasDvtInitialJoinPairForInputs(inputs[0]!, inputs[1]!);
}

export function resolveCanvasDvtInitialJoinRightInputs(
  inputs: readonly CanvasDvtCompositionInput[],
  left: CanvasDvtCompositionInput
): readonly CanvasDvtCompositionInput[] {
  return inputs.filter((right) => resolveCanvasDvtInitialJoinPairForInputs(left, right) != null);
}

export function createCanvasDvtInitialJoinDraft(
  inputs: readonly CanvasDvtCompositionInput[],
  pair: CanvasDvtInitialJoinPair,
  targetNodeId: string,
  joinType: DvtSubstraitJoinType = JoinRel_JoinType.INNER
): SubstraitDocument | null {
  const left = inputs.find((input) => input.nodeId === pair.leftNodeId);
  const right = inputs.find((input) => input.nodeId === pair.rightNodeId);
  if (left == null || right == null) return null;
  return createSourceJoin({
    left: toSourceRelationInput(left),
    right: toSourceRelationInput(right),
    leftFieldName: pair.leftFieldName,
    rightFieldName: pair.rightFieldName,
    targetNodeId,
    joinType,
  });
}
