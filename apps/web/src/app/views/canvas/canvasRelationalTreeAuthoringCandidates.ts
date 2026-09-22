/** Owned concern: admit source append from canonical composition and connected input facts. */
import { hasSameConnectionRef, inspectDvtSubstraitCrossDraft } from '@dvt/postgres-projection';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { resolveCanvasDvtInitialJoinPairForInputs } from './canvasDvtInitialJoinModel';
import {
  inspectDvtSubstraitJoinDraft,
  type DvtSubstraitJoinDraft,
} from './canvasDvtSubstraitJoinComposition';
import { inspectDvtSubstraitUnionAllDraft } from './canvasDvtSubstraitSetComposition';
import {
  isCanvasSetOperation,
  resolveCanvasRelationalOperationChoices,
  type CanvasRelationalOperation,
  type CanvasRelationalOperationAvailability,
} from './canvasRelationalOperationChoices';
import { orderedCanvasRelationalTreeUnionAllEntry } from './canvasRelationalTreeUnionAuthoring';

export type CanvasRelationalTreeAuthoringCandidate = Readonly<{
  nodeId: string;
  selectable: boolean;
  selected: boolean;
  reason: CanvasRelationalOperationAvailability | null;
}>;

function unavailableReason(
  operation: CanvasRelationalOperation,
  inputs: readonly CanvasDvtCompositionInput[]
): CanvasRelationalOperationAvailability {
  if (operation === 'projection') return 'semantically-unavailable';
  return resolveCanvasRelationalOperationChoices({
    inputs,
    predicateAvailable: false,
    readOnly: false,
    unionAllAvailable: false,
  }).find((choice) => choice.operation === operation)!.availability;
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
  const crossInspection =
    args.joinDraft == null ? null : inspectDvtSubstraitCrossDraft(args.joinDraft);
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
    } else if (isCanvasSetOperation(args.operation)) {
      selectable =
        (args.joinDraft == null || inspectDvtSubstraitUnionAllDraft(args.joinDraft).ok) &&
        orderedCanvasRelationalTreeUnionAllEntry({
          ...args,
          selectedInputIds: [...args.selectedInputIds, input.nodeId],
        }) != null;
    } else if (args.operation === 'cross_join') {
      if (args.joinDraft != null && !crossInspection?.ok && !joinInspection?.ok) {
        return {
          nodeId: input.nodeId,
          selectable: false,
          selected: false,
          reason: 'semantically-unavailable',
        };
      }
      const connection =
        crossInspection?.ok === true
          ? crossInspection.projection.inputs[0]?.sourceRef.connectionRef
          : first?.sourceRef.connectionRef;
      selectable =
        connection != null &&
        input.sourceRef.connectionRef.provider === 'postgres' &&
        hasSameConnectionRef(connection, input.sourceRef.connectionRef) &&
        input.fields.length > 0 &&
        input.fields.every((field) => field.joinDataType != null);
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
