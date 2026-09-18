/** Owned concern: coordinate one discardable guided relation-authoring session. */
import { useCallback, useEffect, useState } from 'react';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { CanvasRelationalTreeAuthoringContract } from './canvasRelationalTreeWorkbench.types';
import type { DvtSubstraitInnerJoinDraft } from './canvasDvtSubstraitJoinComposition';
import { useCanvasRelationalTreeApplyCommand } from './useCanvasRelationalTreeApplyCommand';
import { useCanvasRelationalOperandSlots } from './useCanvasRelationalOperandSlots';
import { useCanvasRelationalTreeAuthoringOptions } from './useCanvasRelationalTreeAuthoringOptions';
import {
  useCanvasRelationalTreeExistingJoinSeed,
  type CanvasRelationalTreeJoinSeedHydration,
} from './useCanvasRelationalTreeExistingJoinSeed';
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
    authoring?: CanvasRelationalTreeAuthoringContract;
  }>
) {
  const { authoring, edges, enabled, inputs, nodes, transformNode } = args;
  const editable = authoring?.canEditNode === true;
  const [operation, setOperation] = useState<CanvasRelationalOperation | null>(null);
  const [active, setActive] = useState(false);
  const [joinDraft, setJoinDraft] = useState<DvtSubstraitInnerJoinDraft | null>(null);
  const [appendInputId, setAppendInputId] = useState<string | null>(null);
  const {
    appendInput: appendOperand,
    placeInput: placeOperand,
    primaryInputId,
    replaceInputs,
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
  const hydrateExistingJoinState = useCallback(
    (seed: CanvasRelationalTreeJoinSeedHydration) => {
      setActive(true);
      replaceInputs(seed.inputIds);
      setOperation(seed.operation);
      setJoinDraft(seed.draft);
      setAppendInputId(seed.appendInputId);
    },
    [replaceInputs]
  );
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
    joinDraft,
    nodes,
    operation,
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
    reset,
    selectedInputIds,
    transformNode,
  });
  const start = useCallback(() => {
    if (!enabled || !editable) return false;
    if (!active && (seed?.operation === 'projection' || !hydrateExistingJoin())) setActive(true);
    return true;
  }, [active, editable, enabled, hydrateExistingJoin, seed?.operation]);
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
    setJoinDraft: (draft: DvtSubstraitInnerJoinDraft) => {
      if (!active) hydrateExistingJoin();
      setJoinDraft(draft);
    },
    start,
  } as const;
}
