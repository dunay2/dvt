/** Owned concern: coordinate one discardable guided relation-authoring session. */
import { useCallback, useEffect, useState } from 'react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { CanvasRelationalTreeAuthoringContract } from './canvasRelationalTreeWorkbench.types';
import {
  appendCanvasRelationalTreeJoinInput,
  createCanvasRelationalTreeInitialJoinDraft,
} from './canvasRelationalTreeAuthoringModel';
import type { DvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { useCanvasRelationalTreeApplyCommand } from './useCanvasRelationalTreeApplyCommand';
import { useCanvasRelationalOperandSlots } from './useCanvasRelationalOperandSlots';
import { useCanvasRelationalTreeAuthoringOptions } from './useCanvasRelationalTreeAuthoringOptions';

type AppendJoinSelection = Readonly<{
  leftSourceFieldId: string;
  rightFieldName: string;
}>;

export function useCanvasRelationalTreeAuthoringSession(
  args: Readonly<{
    enabled: boolean;
    transformNode: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
    inputs: readonly CanvasDvtCompositionInput[];
    authoring?: CanvasRelationalTreeAuthoringContract;
  }>
) {
  const { authoring, edges, enabled, inputs, nodes, transformNode } = args;
  const editable = authoring?.canEditNode === true;
  const targetNodeId = transformNode.id;
  const [operation, setOperation] = useState<CanvasRelationalOperation | null>(null);
  const [active, setActive] = useState(false);
  const [joinDraft, setJoinDraft] = useState<DvtSubstraitInnerJoinDraft | null>(null);
  const [appendInputId, setAppendInputId] = useState<string | null>(null);
  const {
    appendInput: appendOperand,
    placeInput: placeOperand,
    primaryInputId,
    resetOperands,
    secondaryInputId,
    selectedInputIds,
    selectInitialInput,
  } = useCanvasRelationalOperandSlots();
  const reset = useCallback(() => {
    setActive(false);
    setOperation(null);
    resetOperands();
    setJoinDraft(null);
    setAppendInputId(null);
  }, [resetOperands]);

  useEffect(reset, [enabled, reset, targetNodeId]);

  const { candidates, choices } = useCanvasRelationalTreeAuthoringOptions({
    editable,
    edges,
    enabled,
    inputs,
    joinDraft,
    nodes,
    operation,
    selectedInputIds,
    targetNodeId,
  });

  const selectInput = useCallback(
    (nodeId: string) => {
      if (!enabled || !editable) return;
      setActive(true);
      if (operation == null) {
        selectInitialInput(nodeId);
        setOperation(null);
        setJoinDraft(null);
        setAppendInputId(null);
        return;
      }
      const candidate = candidates.find((item) => item.nodeId === nodeId);
      if (candidate?.selectable !== true) return;
      if (operation === 'union_all') {
        appendOperand(nodeId);
        return;
      }
      if (joinDraft == null) return;
      setAppendInputId(nodeId);
    },
    [appendOperand, candidates, editable, enabled, joinDraft, operation, selectInitialInput]
  );

  const selectOperation = useCallback(
    (nextOperation: CanvasRelationalOperation) => {
      if (!choices.some((choice) => choice.operation === nextOperation && choice.selectable))
        return;
      if (nextOperation === 'inner_join') {
        const [leftInputId, rightInputId] = selectedInputIds;
        if (leftInputId == null || rightInputId == null) return;
        const draft = createCanvasRelationalTreeInitialJoinDraft({
          inputs,
          targetNodeId,
          leftInputId,
          rightInputId,
        });
        if (draft == null) return;
        setJoinDraft(draft);
      } else {
        setJoinDraft(null);
      }
      setOperation(nextOperation);
      setAppendInputId(null);
    },
    [choices, inputs, selectedInputIds, targetNodeId]
  );

  const placeInput = useCallback(
    (nodeId: string, position: 'primary' | 'secondary') => {
      if (!enabled || !editable || !inputs.some((input) => input.nodeId === nodeId)) return;
      setActive(true);
      placeOperand(nodeId, position);
      setOperation(null);
      setJoinDraft(null);
      setAppendInputId(null);
    },
    [editable, enabled, inputs, placeOperand]
  );

  const appendJoinInput = useCallback(
    (selection: AppendJoinSelection) => {
      const input = inputs.find((candidate) => candidate.nodeId === appendInputId);
      if (input == null || joinDraft == null) return;
      const next = appendCanvasRelationalTreeJoinInput({ draft: joinDraft, input, ...selection });
      if (next === joinDraft) return;
      setJoinDraft(next);
      appendOperand(input.nodeId);
      setAppendInputId(null);
    },
    [appendInputId, appendOperand, inputs, joinDraft]
  );

  const apply = useCanvasRelationalTreeApplyCommand({
    authoring,
    editable,
    edges,
    inputs,
    joinDraft,
    nodes,
    operation,
    reset,
    selectedInputIds,
    transformNode,
  });

  const start = useCallback(() => {
    if (enabled && editable) setActive(true);
  }, [editable, enabled]);

  return {
    active,
    appendInput: inputs.find((input) => input.nodeId === appendInputId) ?? null,
    apply,
    appendJoinInput,
    cancel: reset,
    candidates,
    choices,
    joinDraft,
    operation,
    placeInput,
    primaryInputId,
    secondaryInputId,
    selectedInputIds,
    selectInput,
    selectOperation,
    setJoinDraft,
    start,
  } as const;
}
