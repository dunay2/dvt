/** Owned concern: transition the local relational operation and JOIN draft without writing. */
import { useCallback } from 'react';

import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type {
  CanvasRelationalOperation,
  CanvasRelationalOperationChoice,
} from './canvasRelationalOperationChoices';
import { appendCanvasRelationalTreeJoinInput } from './canvasRelationalTreeAuthoringModel';
import { isCanvasJoinOperation } from './canvasRelationalTreeJoinType';
import type { DvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { resolveCanvasRelationalTreeOperationTransition } from './canvasRelationalTreeOperationTransition';

export function useCanvasRelationalTreeJoinDraftActions(
  args: Readonly<{
    appendInputId: string | null;
    choices: readonly CanvasRelationalOperationChoice[];
    inputs: readonly CanvasDvtCompositionInput[];
    joinDraft: DvtSubstraitJoinDraft | null;
    operation: CanvasRelationalOperation | null;
    selectedInputIds: readonly string[];
    targetNodeId: string;
    appendOperand: (nodeId: string) => void;
    setAppendInputId: (nodeId: string | null) => void;
    setJoinDraft: (draft: DvtSubstraitJoinDraft | null) => void;
    setOperation: (operation: CanvasRelationalOperation | null) => void;
  }>
) {
  const {
    appendInputId,
    appendOperand,
    choices,
    inputs,
    joinDraft,
    operation,
    selectedInputIds,
    setAppendInputId,
    setJoinDraft,
    setOperation,
    targetNodeId,
  } = args;
  const selectOperation = useCallback(
    (nextOperation: CanvasRelationalOperation) => {
      if (!choices.some((choice) => choice.operation === nextOperation && choice.selectable))
        return;
      const transition = resolveCanvasRelationalTreeOperationTransition({
        operation: nextOperation,
        inputs,
        targetNodeId,
        selectedInputIds,
        draft: joinDraft,
        appendInputId,
      });
      if (transition == null) return;
      setJoinDraft(transition.draft);
      if (transition.appendedInputId != null) appendOperand(transition.appendedInputId);
      setOperation(nextOperation);
      setAppendInputId(null);
    },
    [
      choices,
      appendInputId,
      appendOperand,
      inputs,
      joinDraft,
      operation,
      selectedInputIds,
      setAppendInputId,
      setJoinDraft,
      setOperation,
      targetNodeId,
    ]
  );
  const appendJoinInput = useCallback(
    (selection: Readonly<{ leftSourceFieldId: string; rightFieldName: string }>) => {
      const input = inputs.find((candidate) => candidate.nodeId === appendInputId);
      if (input == null || joinDraft == null) return;
      const next = appendCanvasRelationalTreeJoinInput({
        draft: joinDraft,
        input,
        operation: isCanvasJoinOperation(operation) ? operation : undefined,
        ...selection,
      });
      if (next === joinDraft) return;
      setJoinDraft(next);
      appendOperand(input.nodeId);
      setAppendInputId(null);
    },
    [appendInputId, appendOperand, inputs, joinDraft, operation, setAppendInputId, setJoinDraft]
  );
  return { appendJoinInput, selectOperation } as const;
}
