/** Owned concern: derive guided relational authoring choices and canonical DVT drafts. */
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';
import { hasSameConnectionRef } from '@dvt/postgres-projection';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { createCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { toSubstraitJoinType } from './canvasRelationalTreeJoinType';
import { orderedCanvasRelationalTreeUnionAllEntry } from './canvasRelationalTreeUnionAuthoring';
import {
  createCanvasDvtInitialJoinDraft,
  resolveCanvasDvtInitialJoinPairForInputs,
} from './canvasDvtInitialJoinModel';
import {
  resolveCanvasRelationalOperationChoices,
  resolveCanvasRelationalProjectionChoice,
  type CanvasRelationalOperation,
  type CanvasRelationalOperationAvailability,
  type CanvasRelationalOperationChoice,
} from './canvasRelationalOperationChoices';
import {
  appendDvtSubstraitJoinInput,
  inspectDvtSubstraitJoinDraft,
  type DvtSubstraitJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import { inspectDvtSubstraitUnionAllDraft } from './canvasDvtSubstraitSetComposition';

export type CanvasRelationalTreeAuthoringCandidate = Readonly<{
  nodeId: string;
  selectable: boolean;
  selected: boolean;
  reason: CanvasRelationalOperationAvailability | null;
}>;

export function createCanvasRelationalTreeInitialJoinDraft(
  args: Readonly<{
    inputs: readonly CanvasDvtCompositionInput[];
    targetNodeId: string;
    leftInputId: string;
    rightInputId: string;
    operation?: 'inner_join' | 'left_join';
  }>
): DvtSubstraitJoinDraft | null {
  const left = args.inputs.find((input) => input.nodeId === args.leftInputId);
  const right = args.inputs.find((input) => input.nodeId === args.rightInputId);
  if (left == null || right == null) return null;
  const pair = resolveCanvasDvtInitialJoinPairForInputs(left, right);
  return pair == null
    ? null
    : createCanvasDvtInitialJoinDraft(
        args.inputs,
        pair,
        args.targetNodeId,
        toSubstraitJoinType(args.operation)
      );
}

export function appendCanvasRelationalTreeJoinInput(
  args: Readonly<{
    draft: DvtSubstraitJoinDraft;
    input: CanvasDvtCompositionInput;
    leftSourceFieldId: string;
    rightFieldName: string;
    operation?: 'inner_join' | 'left_join';
  }>
): DvtSubstraitJoinDraft {
  const fields = args.input.fields.filter((field) => field.joinDataType != null);
  return appendDvtSubstraitJoinInput(args.draft, {
    source: args.input,
    fields: fields.map((field) => field.name),
    fieldTypes: fields.map((field) => field.joinDataType!),
    fieldNullabilities: fields.map((field) => field.nullable ?? true),
    predicate: {
      leftSourceFieldId: args.leftSourceFieldId,
      rightFieldName: args.rightFieldName,
    },
    selectedFields: fields.map((field) => field.name),
    joinType: toSubstraitJoinType(args.operation),
  });
}

export function createCanvasRelationalTreeNodeDraft(
  node: CanonicalNode,
  shape: CanvasRelationalOperation,
  semantic: Pick<DvtSubstraitJoinDraft, 'plan' | 'sidecar'>
): CanvasInspectorNodeDraft {
  const draft = createCanvasInspectorNodeDraft(node);
  const disposition =
    draft.dvt?.kind === 'transform'
      ? draft.dvt
      : { kind: 'transform' as const, mode: 'uninitialized' as const, materialized: 'view' };
  return {
    ...draft,
    dvt: {
      kind: 'transform',
      mode: DVT_TRANSFORM_AUTHORING_MODE.substrait,
      materialized: disposition.materialized,
      ...(disposition.resultTarget === undefined ? {} : { resultTarget: disposition.resultTarget }),
      shape,
      plan: semantic.plan,
      sidecar: semantic.sidecar,
    },
  };
}

function operationChoice(
  operation: CanvasRelationalOperation,
  inputs: readonly CanvasDvtCompositionInput[],
  readOnly: boolean,
  unionAllAvailable: boolean
): CanvasRelationalOperationChoice {
  return resolveCanvasRelationalOperationChoices({
    inputs,
    predicateAvailable: false,
    readOnly,
    unionAllAvailable,
  }).find((choice) => choice.operation === operation)!;
}

export function resolveCanvasRelationalTreeAuthoringChoices(
  args: Readonly<{
    inputs: readonly CanvasDvtCompositionInput[];
    selectedInputIds: readonly string[];
    readOnly: boolean;
    targetNodeId: string;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
  }>
): readonly CanvasRelationalOperationChoice[] {
  const first = args.inputs.find((input) => input.nodeId === args.selectedInputIds[0]);
  if (first == null) return [];
  if (args.selectedInputIds.length === 1) {
    return [
      resolveCanvasRelationalProjectionChoice(args.readOnly),
      ...resolveCanvasRelationalOperationChoices({
        inputs: args.inputs,
        predicateAvailable: false,
        readOnly: args.readOnly,
        unionAllAvailable: false,
      }).map((choice) => ({
        ...choice,
        selectable: false,
        availability: args.readOnly ? ('read-only' as const) : ('needs-input' as const),
      })),
    ];
  }
  const second = args.inputs.find((input) => input.nodeId === args.selectedInputIds[1]);
  if (second == null) return [];
  const selectedInputs = [first, second];
  const unionAvailable =
    orderedCanvasRelationalTreeUnionAllEntry({
      ...args,
      selectedInputIds: [first.nodeId, second.nodeId],
    }) != null;
  return [
    operationChoice('inner_join', selectedInputs, args.readOnly, false),
    operationChoice('left_join', selectedInputs, args.readOnly, false),
    operationChoice('union_all', selectedInputs, args.readOnly, unionAvailable),
  ];
}

function unavailableReason(
  operation: CanvasRelationalOperation,
  inputs: readonly CanvasDvtCompositionInput[]
): CanvasRelationalOperationAvailability {
  if (operation === 'projection') return 'semantically-unavailable';
  return operationChoice(operation, inputs, false, false).availability;
}

export function resolveCanvasRelationalTreeAuthoringCandidates(
  args: Readonly<{
    operation: CanvasRelationalOperation;
    inputs: readonly CanvasDvtCompositionInput[];
    selectedInputIds: readonly string[];
    joinDraft: DvtSubstraitJoinDraft | null;
    targetNodeId: string;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
  }>
): readonly CanvasRelationalTreeAuthoringCandidate[] {
  const selected = new Set(args.selectedInputIds);
  const first = args.inputs.find((input) => input.nodeId === args.selectedInputIds[0]);
  const joinInspection =
    args.joinDraft == null ? null : inspectDvtSubstraitJoinDraft(args.joinDraft);
  return args.inputs.map((input) => {
    if (selected.has(input.nodeId)) {
      return { nodeId: input.nodeId, selectable: false, selected: true, reason: null };
    }
    let selectable = false;
    if (args.operation === 'projection') {
      selectable =
        first != null &&
        (resolveCanvasDvtInitialJoinPairForInputs(first, input) != null ||
          orderedCanvasRelationalTreeUnionAllEntry({
            ...args,
            selectedInputIds: [first.nodeId, input.nodeId],
          }) != null);
    } else if (args.operation === 'union_all') {
      selectable =
        (args.joinDraft == null || inspectDvtSubstraitUnionAllDraft(args.joinDraft).ok) &&
        orderedCanvasRelationalTreeUnionAllEntry({
          ...args,
          selectedInputIds: [...args.selectedInputIds, input.nodeId],
        }) != null;
    } else if (args.joinDraft == null) {
      selectable = first != null && resolveCanvasDvtInitialJoinPairForInputs(first, input) != null;
    } else if (joinInspection?.ok) {
      const connection = joinInspection.projection.inputs[0]?.sourceRef.connectionRef;
      selectable =
        connection != null &&
        hasSameConnectionRef(connection, input.sourceRef.connectionRef) &&
        input.fields.some(
          (field) =>
            field.joinDataType != null &&
            joinInspection.projection.outputs.some(
              (output) => output.dataType === field.joinDataType
            )
        );
    }
    return {
      nodeId: input.nodeId,
      selectable,
      selected: false,
      reason: selectable
        ? null
        : unavailableReason(args.operation, first == null ? [input] : [first, input]),
    };
  });
}
