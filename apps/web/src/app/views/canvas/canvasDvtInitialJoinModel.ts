/** Owned concern: select and build one typed initial INNER JOIN draft. */
import { hasSameConnectionRef } from '@dvt/postgres-projection';

import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import {
  createDvtSubstraitStringInnerJoinDraft,
  type DvtSubstraitInnerJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import {
  hasCompatibleCanvasDvtJoinFields,
  resolveCanvasDvtJoinFieldPair,
} from './canvasDvtJoinTypeAdmission';

export type CanvasDvtInitialJoinSelection = Readonly<{
  targetNodeId: string;
  left: Readonly<{ nodeId: string; fieldName: string }>;
  right: Readonly<{ nodeId: string; fieldName: string }>;
}>;

export type CanvasDvtInitialJoinPair = Readonly<{
  leftNodeId: string;
  rightNodeId: string;
  leftFieldName: string;
  rightFieldName: string;
}>;

export function resolveCanvasDvtInitialJoinPairForInputs(
  left: CanvasDvtCompositionInput,
  right: CanvasDvtCompositionInput,
  preferred?: Readonly<{ leftFieldName: string; rightFieldName: string }>
): CanvasDvtInitialJoinPair | null {
  if (!(
    left.nodeId !== right.nodeId &&
    left.sourceRef.connectionRef.provider === 'postgres' &&
    right.sourceRef.connectionRef.provider === 'postgres' &&
    hasSameConnectionRef(left.sourceRef.connectionRef, right.sourceRef.connectionRef) &&
    hasCompatibleCanvasDvtJoinFields(left.fields, right.fields)
  )) {
    return null;
  }
  const preferredLeft = left.fields.find((field) => field.name === preferred?.leftFieldName);
  const preferredRight = right.fields.find((field) => field.name === preferred?.rightFieldName);
  if (
    preferredLeft?.joinDataType != null &&
    preferredLeft.joinDataType === preferredRight?.joinDataType
  ) {
    return {
      leftNodeId: left.nodeId,
      rightNodeId: right.nodeId,
      leftFieldName: preferredLeft.name,
      rightFieldName: preferredRight.name,
    };
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
  inputs: readonly CanvasDvtCompositionInput[],
  proposal?: CanvasDvtInitialJoinSelection
): CanvasDvtInitialJoinPair | null {
  const proposedLeft = inputs.find((input) => input.nodeId === proposal?.left.nodeId);
  const proposedRight = inputs.find((input) => input.nodeId === proposal?.right.nodeId);
  if (proposal != null && proposedLeft != null && proposedRight != null) {
    const proposedPair = resolveCanvasDvtInitialJoinPairForInputs(proposedLeft, proposedRight, {
      leftFieldName: proposal.left.fieldName,
      rightFieldName: proposal.right.fieldName,
    });
    if (
      proposedPair?.leftFieldName === proposal.left.fieldName &&
      proposedPair.rightFieldName === proposal.right.fieldName
    ) {
      return proposedPair;
    }
  }
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
  targetNodeId: string
): DvtSubstraitInnerJoinDraft | null {
  const left = inputs.find((input) => input.nodeId === pair.leftNodeId);
  const right = inputs.find((input) => input.nodeId === pair.rightNodeId);
  if (left == null || right == null) return null;
  const leftFields = left.fields.flatMap((field) =>
    field.joinDataType == null ? [] : [{ name: field.name, dataType: field.joinDataType }]
  );
  const rightFields = right.fields.flatMap((field) =>
    field.joinDataType == null ? [] : [{ name: field.name, dataType: field.joinDataType }]
  );
  return createDvtSubstraitStringInnerJoinDraft({
    left: {
      source: left,
      fields: leftFields.map((field) => field.name),
      fieldTypes: leftFields.map((field) => field.dataType),
    },
    right: {
      source: right,
      fields: rightFields.map((field) => field.name),
      fieldTypes: rightFields.map((field) => field.dataType),
    },
    leftFieldName: pair.leftFieldName,
    rightFieldName: pair.rightFieldName,
    targetNodeId,
  });
}
