import { sourceOperationFacts } from './canvasSourceOperationFacts';
/** Owned concern: derive guided relational authoring choices and canonical DVT drafts. */
import { DVT_TRANSFORM_AUTHORING_MODE } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import { createCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import { toSubstraitJoinType, type CanvasJoinOperation } from './canvasRelationalTreeJoinType';
import { orderedCanvasRelationalTreeUnionAllEntry } from './canvasRelationalTreeUnionAuthoring';
import {
  createCanvasDvtInitialJoinDraft,
  resolveCanvasDvtInitialJoinPairForInputs,
} from './canvasDvtInitialJoinModel';
import {
  resolveCanvasRelationalOperationChoices,
  resolveCanvasRelationalProjectionChoice,
  type CanvasRelationalOperation,
  type CanvasRelationalOperationChoice,
} from './canvasRelationalOperationChoices';
import type { SubstraitDocument } from '@dvt/substrait-analysis';

export function createCanvasRelationalTreeInitialJoinDraft(
  args: Readonly<{
    inputs: readonly CanvasDvtCompositionInput[];
    targetNodeId: string;
    leftInputId: string;
    rightInputId: string;
    operation?: CanvasJoinOperation;
  }>
): SubstraitDocument | null {
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
        toSubstraitJoinType(args.operation ?? 'inner_join')
      );
}

export function createCanvasRelationalTreeNodeDraft(
  node: CanonicalNode,
  shape: CanvasRelationalOperation,
  semantic: Pick<SubstraitDocument, 'plan' | 'sidecar'>
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
      ...resolveCanvasRelationalOperationChoices(
        sourceOperationFacts({
          inputs: args.inputs,
          predicateAvailable: false,
          readOnly: args.readOnly,
          unionAllAvailable: false,
        })
      ).map((choice) => ({
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
  return resolveCanvasRelationalOperationChoices(
    sourceOperationFacts({
      inputs: selectedInputs,
      predicateAvailable: false,
      readOnly: args.readOnly,
      unionAllAvailable: unionAvailable,
    })
  );
}
