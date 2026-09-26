/** Own staged-operation lifecycle and its single transition into the canonical draft. */
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import {
  isCanvasSetOperation,
  type CanvasRelationalOperation,
} from './canvasRelationalOperationChoices';
import { isCanvasJoinOperation } from './canvasRelationalTreeJoinType';
import { createCanvasRelationalTreeOperationDraft } from './canvasRelationalTreeOperationDraft';
import { insertSelectedRelationTransform } from './canvasSelectedRelationTransform';
import { canvasStagedOperationArity, type CanvasStagedOperation } from './canvasStagedOperation';
import { createCanvasStagedOperationActions } from './canvasStagedOperationActions';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import type { useCanvasRelationAnalysisSession } from './useCanvasRelationAnalysisSession';
import type { useCanvasRelationComposition } from './useCanvasRelationComposition';
import type { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';
import type { useRelationCommand } from './useRelationCommand';

type DraftState = Pick<
  ReturnType<typeof useCanvasRelationalTreeDraftState>,
  | 'slots'
  | 'setJoinDraft'
  | 'setOperation'
  | 'setPendingSourceId'
  | 'setAppendInputId'
  | 'setAppendTargetRelationId'
  | 'consumePendingSource'
  | 'stagedOperations'
  | 'setStagedOperations'
  | 'selectedStagedOperationId'
  | 'setSelectedStagedOperationId'
>;

export function useCanvasStagedOperationSession(
  args: Readonly<{
    editable: boolean;
    start: () => boolean;
    targetNodeId: string;
    inputs: readonly CanvasDvtCompositionInput[];
    pendingSources: readonly PendingSourceOccurrence[];
    analysis: ReturnType<typeof useCanvasRelationAnalysisSession>;
    composition: Pick<ReturnType<typeof useCanvasRelationComposition>, 'appendStaged'>;
    command: ReturnType<typeof useRelationCommand>;
    state: DraftState;
  }>
) {
  const finish = (id: string) => {
    args.state.setStagedOperations((current) => current.filter((operation) => operation.id !== id));
    args.state.setSelectedStagedOperationId((current) => (current === id ? null : current));
  };
  const connect = (staged: CanvasStagedOperation) => {
    if (canvasStagedOperationArity(staged.operation) === 2) {
      const [leftRelationId, rightRelationId] = staged.inputs;
      if (leftRelationId == null || rightRelationId == null || args.analysis?.document == null)
        return;
      const pending = args.pendingSources.find(
        (item) => item.read.binding.relationId === rightRelationId
      );
      if (pending == null) return;
      try {
        args.analysis.session.locate(leftRelationId, args.analysis.revision);
      } catch {
        return;
      }
      const operation = staged.operation as CanvasRelationalOperation;
      if (isCanvasJoinOperation(operation)) {
        args.state.setPendingSourceId(pending.read.binding.relationId);
        args.state.setAppendInputId(pending.sourceNodeId);
        args.state.setAppendTargetRelationId(leftRelationId);
        args.state.setOperation(operation);
        finish(staged.id);
        return;
      }
      if (operation !== 'cross_join' && !isCanvasSetOperation(operation)) return;
      void args.composition.appendStaged(pending, operation, leftRelationId).then((accepted) => {
        if (accepted) finish(staged.id);
      });
      return;
    }
    if (
      (staged.operation !== 'field_transform' && staged.operation !== 'projection') ||
      staged.inputs[0] == null
    )
      return;
    const relationId = staged.inputs[0];
    const pending = args.pendingSources.find((item) => item.read.binding.relationId === relationId);
    if (args.analysis?.document == null) {
      if (pending == null) return;
      const document = createCanvasRelationalTreeOperationDraft({
        operation: 'projection',
        inputs: args.inputs,
        selectedInputIds: [pending.sourceNodeId],
        targetNodeId: args.targetNodeId,
        pendingSource: pending,
      });
      if (document == null) return;
      args.state.slots.replaceInputs([pending.sourceNodeId]);
      args.state.setJoinDraft(document);
      args.state.setOperation('projection');
      args.state.consumePendingSource(pending.read.binding.relationId);
      finish(staged.id);
      return;
    }
    if (pending != null) return;
    void args.command
      .executeAt(relationId, (session, request) =>
        insertSelectedRelationTransform(session, request).then((result) => result.document)
      )
      .then((accepted) => {
        if (accepted) finish(staged.id);
      });
  };
  return createCanvasStagedOperationActions({
    editable: args.editable,
    start: args.start,
    operations: args.state.stagedOperations,
    setOperations: args.state.setStagedOperations,
    selectedId: args.state.selectedStagedOperationId,
    setSelectedId: args.state.setSelectedStagedOperationId,
    onConnected: connect,
  });
}
