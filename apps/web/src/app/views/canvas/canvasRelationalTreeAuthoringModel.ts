/** Owned concern: derive guided relational authoring choices and canonical DVT drafts. */
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';
import { hasSameConnectionRef } from '@dvt/postgres-projection';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { createCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
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
  appendDvtSubstraitInnerJoinInput,
  inspectDvtSubstraitNInputJoinDraft,
  type DvtSubstraitInnerJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import {
  createDvtSubstraitUnionAllDraft,
  inspectDvtSubstraitUnionAllDraft,
  resolveDvtSubstraitUnionAllEntry,
  type DvtSubstraitUnionAllDraft,
} from './canvasDvtSubstraitSetComposition';

export type CanvasRelationalTreeAuthoringCandidate = Readonly<{
  nodeId: string;
  selectable: boolean;
  selected: boolean;
  reason: CanvasRelationalOperationAvailability | null;
}>;

type UnionContext = Readonly<{
  selectedInputIds: readonly string[];
  targetNodeId: string;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}>;

function orderedUnionAllEntry(args: UnionContext) {
  const selectedIds = new Set(args.selectedInputIds);
  const targetNode = args.nodes.find((node) => node.id === args.targetNodeId);
  if (targetNode == null) return null;
  const entry = resolveDvtSubstraitUnionAllEntry({
    targetNode,
    nodes: args.nodes,
    edges: args.edges.filter(
      (edge) => edge.targetId === args.targetNodeId && selectedIds.has(edge.sourceId)
    ),
  });
  if (entry == null) return null;
  const byNodeId = new Map(entry.inputs.map((input) => [input.nodeId, input] as const));
  const ordered = args.selectedInputIds.map((nodeId) => byNodeId.get(nodeId));
  return ordered.some((input) => input == null)
    ? null
    : { ...entry, inputs: ordered.filter((input) => input != null) };
}

export function createCanvasRelationalTreeUnionAllDraft(
  args: UnionContext
): DvtSubstraitUnionAllDraft | null {
  const entry = orderedUnionAllEntry(args);
  return entry == null ? null : createDvtSubstraitUnionAllDraft(entry);
}

export function createCanvasRelationalTreeInitialJoinDraft(
  args: Readonly<{
    inputs: readonly CanvasDvtCompositionInput[];
    targetNodeId: string;
    leftInputId: string;
    rightInputId: string;
  }>
): DvtSubstraitInnerJoinDraft | null {
  const left = args.inputs.find((input) => input.nodeId === args.leftInputId);
  const right = args.inputs.find((input) => input.nodeId === args.rightInputId);
  if (left == null || right == null) return null;
  const pair = resolveCanvasDvtInitialJoinPairForInputs(left, right);
  return pair == null
    ? null
    : createCanvasDvtInitialJoinDraft(args.inputs, pair, args.targetNodeId);
}

export function appendCanvasRelationalTreeJoinInput(
  args: Readonly<{
    draft: DvtSubstraitInnerJoinDraft;
    input: CanvasDvtCompositionInput;
    leftSourceFieldId: string;
    rightFieldName: string;
  }>
): DvtSubstraitInnerJoinDraft {
  const fields = args.input.fields.filter((field) => field.joinDataType != null);
  return appendDvtSubstraitInnerJoinInput(args.draft, {
    source: args.input,
    fields: fields.map((field) => field.name),
    fieldTypes: fields.map((field) => field.joinDataType!),
    predicate: {
      leftSourceFieldId: args.leftSourceFieldId,
      rightFieldName: args.rightFieldName,
    },
    selectedFields: fields.map((field) => field.name),
  });
}

export function createCanvasRelationalTreeNodeDraft(
  node: CanonicalNode,
  shape: CanvasRelationalOperation,
  semantic: Pick<DvtSubstraitInnerJoinDraft, 'plan' | 'sidecar'>
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
    orderedUnionAllEntry({ ...args, selectedInputIds: [first.nodeId, second.nodeId] }) != null;
  return [
    operationChoice('inner_join', selectedInputs, args.readOnly, false),
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
    joinDraft: DvtSubstraitInnerJoinDraft | null;
    targetNodeId: string;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
  }>
): readonly CanvasRelationalTreeAuthoringCandidate[] {
  const selected = new Set(args.selectedInputIds);
  const first = args.inputs.find((input) => input.nodeId === args.selectedInputIds[0]);
  const joinInspection =
    args.joinDraft == null ? null : inspectDvtSubstraitNInputJoinDraft(args.joinDraft);
  return args.inputs.map((input) => {
    if (selected.has(input.nodeId)) {
      return { nodeId: input.nodeId, selectable: false, selected: true, reason: null };
    }
    let selectable = false;
    if (args.operation === 'projection') {
      selectable =
        first != null &&
        (resolveCanvasDvtInitialJoinPairForInputs(first, input) != null ||
          orderedUnionAllEntry({ ...args, selectedInputIds: [first.nodeId, input.nodeId] }) !=
            null);
    } else if (args.operation === 'union_all') {
      selectable =
        (args.joinDraft == null || inspectDvtSubstraitUnionAllDraft(args.joinDraft).ok) &&
        orderedUnionAllEntry({
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
