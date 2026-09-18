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
      setOperation('inner_join');
      setJoinDraft(seed.draft);
      setAppendInputId(seed.appendInputId);
    },
    [replaceInputs]
  );
  const { hydrateExistingJoin, baselineDraft } = useCanvasRelationalTreeExistingJoinSeed({
    edges,
    inputs,
    nodes,
    targetNodeId: transformNode.id,
    transformNode,
    onHydrate: hydrateExistingJoinState,
  });

  useEffect(reset, [enabled, reset, transformNode.id]);
  const { candidates, choices } = useCanvasRelationalTreeAuthoringOptions({
    editable,
    edges,
    enabled,
    inputs,
    joinDraft,
    nodes,
    operation,
    selectedInputIds,
    targetNodeId: transformNode.id,
  });

  const selectInput = useCallback(
    (nodeId: string) => {
      if (!enabled || !editable) return;
      setActive(true);
      if (!active && hydrateExistingJoin(nodeId)) return;
      if (operation == null) {
        selectInitialInput(nodeId);
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
      if (joinDraft != null) setAppendInputId(nodeId);
    },
    [
      active,
      appendOperand,
      candidates,
      editable,
      enabled,
      hydrateExistingJoin,
      joinDraft,
      operation,
      selectInitialInput,
    ]
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

  const { appendJoinInput, selectOperation } = useCanvasRelationalTreeJoinDraftActions({
    appendInputId,
    choices,
    inputs,
    joinDraft,
    selectedInputIds,
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
    if (!enabled || !editable || active) return;
    if (!hydrateExistingJoin()) setActive(true);
  }, [active, editable, enabled, hydrateExistingJoin]);

  return {
    active,
    baselineDraft,
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
