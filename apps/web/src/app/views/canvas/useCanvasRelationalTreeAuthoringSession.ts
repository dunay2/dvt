/** Owned concern: coordinate one discardable guided relation-authoring session. */
import { useCallback, useEffect } from 'react';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type * as W from './canvasRelationalTreeWorkbench.types';
import type { DvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { useCanvasRelationalTreeApplyCommand } from './useCanvasRelationalTreeApplyCommand';
import { useCanvasRelationalTreeDraftState } from './useCanvasRelationalTreeDraftState';
import { useCanvasRelationalTreeAuthoringOptions } from './useCanvasRelationalTreeAuthoringOptions';
import { useCanvasRelationalTreeExistingJoinSeed } from './useCanvasRelationalTreeExistingJoinSeed';
import { useCanvasRelationalTreeJoinDraftActions } from './useCanvasRelationalTreeJoinDraftActions';
import { useCanvasRelationalTreeRemoval } from './useCanvasRelationalTreeRemoval';
import { useCanvasRelationalTreeInputSelection } from './useCanvasRelationalTreeInputSelection';
export function useCanvasRelationalTreeAuthoringSession(
  args: Readonly<{
    enabled: boolean;
    transformNode: CanonicalNode;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
    inputs: readonly CanvasDvtCompositionInput[];
    authoring?: W.CanvasRelationalTreeAuthoringContract;
  }>
) {
  const { authoring, edges, enabled, inputs, nodes, transformNode } = args;
  const editable = authoring?.canEditNode === true;
  const {
    slots,
    operation,
    setOperation,
    active,
    setActive,
    joinDraft,
    setJoinDraft,
    appendInputId,
    setAppendInputId,
    applyRejection,
    setApplyRejection,
    reset,
    hydrate: hydrateExistingJoinState,
  } = useCanvasRelationalTreeDraftState();
  const {
    appendInput: appendOperand,
    placeInput: placeOperand,
    primaryInputId,
    replaceInputs,
    secondaryInputId,
    selectedInputIds,
    selectInitialInput,
  } = slots;
  const { hydrateExistingJoin, baselineDraft, seed } = useCanvasRelationalTreeExistingJoinSeed({
    edges,
    inputs,
    nodes,
    targetNodeId: transformNode.id,
    transformNode,
    onHydrate: hydrateExistingJoinState,
  });
  useEffect(reset, [enabled, reset, transformNode.id]);
  const effectiveInputIds = !active && seed != null ? seed.inputIds : selectedInputIds;
  const { candidates, choices } = useCanvasRelationalTreeAuthoringOptions({
    editable,
    edges,
    enabled,
    inputs,
    joinDraft: !active && seed != null ? seed.draft : joinDraft,
    nodes,
    operation: !active && seed != null ? seed.operation : operation,
    selectedInputIds: effectiveInputIds,
    targetNodeId: transformNode.id,
  });
  const { selectInput, placeInput } = useCanvasRelationalTreeInputSelection({
    enabled,
    editable,
    active,
    operation,
    candidates,
    joinDraft,
    setActive,
    hydrateExistingJoin,
    selectInitialInput,
    setJoinDraft,
    setAppendInputId,
    appendOperand,
    inputs,
    placeOperand,
    setOperation,
  });
  const { appendJoinInput, selectOperation: chooseOperation } =
    useCanvasRelationalTreeJoinDraftActions({
      appendInputId,
      choices,
      inputs,
      joinDraft: !active && seed != null ? seed.draft : joinDraft,
      operation: !active && seed != null ? seed.operation : operation,
      selectedInputIds: effectiveInputIds,
      targetNodeId: transformNode.id,
      appendOperand,
      setAppendInputId,
      setJoinDraft,
      setOperation,
    });
  const apply = useCanvasRelationalTreeApplyCommand({
    authoring,
    editable,
    edges,
    inputs,
    joinDraft,
    nodes,
    operation,
    reject: setApplyRejection,
    reset,
    selectedInputIds,
    transformNode,
  });
  const start = useCallback(() => {
    if (!enabled || !editable) return false;
    if (!active && !hydrateExistingJoin()) setActive(true);
    return true;
  }, [active, editable, enabled, hydrateExistingJoin]);
  const removal = useCanvasRelationalTreeRemoval({
    enabled: enabled && editable,
    active,
    draft: joinDraft,
    selectedInputIds,
    seed,
    targetNodeId: transformNode.id,
    hydrate: hydrateExistingJoin,
    accept: (result, ids) => {
      setActive(true);
      setJoinDraft(result.draft);
      setOperation(result.operation);
      replaceInputs(ids);
      setAppendInputId(null);
    },
  });
  return {
    removal,
    applyRejection,
    active,
    baselineDraft,
    seed,
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
    selectOperation: (next: CanvasRelationalOperation) => {
      if (start()) chooseOperation(next);
    },
    setJoinDraft: (draft: DvtSubstraitJoinDraft) => {
      if (!active) hydrateExistingJoin();
      setJoinDraft(draft);
    },
    start,
  } as const;
}
