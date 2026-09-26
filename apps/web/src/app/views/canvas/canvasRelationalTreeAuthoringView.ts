/** Explicit presentation data and actions; the view does not depend on the hook's return type. */
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type {
  CanvasRelationalOperation,
  CanvasRelationalOperationChoice,
} from './canvasRelationalOperationChoices';
import type { CanvasRelationalOperandPosition } from './CanvasRelationalTreeOperandSlot';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import type { useCanvasRelationalTreeWorkbenchModel } from './useCanvasRelationalTreeWorkbenchModel';

export type CanvasRelationalTreeAuthoringDto = Readonly<{
  transformNode: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  inputs: readonly CanvasDvtCompositionInput[];
  draft: SubstraitDocument | null;
  operation: CanvasRelationalOperation | null;
  choices: readonly CanvasRelationalOperationChoice[];
  appendInput: CanvasDvtCompositionInput | null;
  primaryInputId: string | null;
  secondaryInputId: string | null;
  selectedInputIds: readonly string[];
  selectedRelationId: string | null;
  pendingSources: readonly PendingSourceOccurrence[];
  selectedPendingId: string | null;
}>;

export type CanvasRelationalTreeAuthoringActions = Readonly<{
  changeDraft: (document: SubstraitDocument) => void;
  selectOperation: (operation: CanvasRelationalOperation, relationId?: string) => void;
  placeInput: (id: string, position: CanvasRelationalOperandPosition) => void;
  appendJoinInput: (
    selection: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>
  ) => void;
  selectRelation: (id: string | null) => void;
  reconcileSelection: (id: string | null) => void;
  remove: (id: string, keep?: 'left' | 'right') => void;
  dropSource: (id: string) => string | null;
  selectPending: (id: string) => void;
  removePending: (id: string) => void;
  connectPending: (id: string) => void;
  renamePending: (id: string, alias: string) => boolean;
}>;

export function projectCanvasRelationalTreeAuthoringView(
  context: Readonly<{
    model: ReturnType<typeof useCanvasRelationalTreeWorkbenchModel>;
    transformNode: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
    pendingCondition: boolean;
  }>,
  selectRelation: CanvasRelationalTreeAuthoringActions['selectRelation']
): Readonly<{
  data: CanvasRelationalTreeAuthoringDto;
  actions: CanvasRelationalTreeAuthoringActions;
}> {
  const { model, transformNode, nodes, edges } = context;
  const { session } = model;
  const select =
    session.occurrences.pending.length > 0 && !context.pendingCondition
      ? model.selectRelation
      : selectRelation;
  return {
    data: {
      transformNode,
      nodes,
      edges,
      inputs: model.inputs,
      draft: session.joinDraft,
      operation: session.operation,
      choices: session.choices,
      appendInput: session.appendInput,
      primaryInputId: session.primaryInputId,
      secondaryInputId: session.secondaryInputId,
      selectedInputIds: session.selectedInputIds,
      selectedRelationId:
        session.appendInput == null
          ? model.selectedRelationId
          : (session.analysis?.session.rootId ?? null),
      pendingSources: session.occurrences.pending,
      selectedPendingId: session.occurrences.selectedId,
    },
    actions: {
      changeDraft: session.setJoinDraft,
      selectOperation: session.selectOperation,
      placeInput: session.placeInput,
      appendJoinInput: session.appendJoinInput,
      selectRelation: select,
      reconcileSelection: model.selectRelation,
      remove: session.removal.remove,
      dropSource: session.occurrences.drop,
      selectPending: select,
      removePending: session.occurrences.remove,
      connectPending: session.occurrences.connect,
      renamePending: session.occurrences.rename,
    },
  };
}
