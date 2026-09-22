/** Owned concern: own the discardable relation draft and reset/hydrate it atomically. */
import { useCallback, useState } from 'react';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { DvtSubstraitJoinDraft } from './canvasDvtSubstraitJoinComposition';
import type { RelationalApplyRejection } from './canvasRelationalTreeWorkbench.types';
import type { CanvasRelationalTreeJoinSeedHydration } from './useCanvasRelationalTreeExistingJoinSeed';
import { useCanvasRelationalOperandSlots } from './useCanvasRelationalOperandSlots';

export function useCanvasRelationalTreeDraftState() {
  const [operation, setOperation] = useState<CanvasRelationalOperation | null>(null);
  const [active, setActive] = useState(false);
  const [joinDraft, setJoinDraft] = useState<DvtSubstraitJoinDraft | null>(null);
  const [appendInputId, setAppendInputId] = useState<string | null>(null);
  const [applyRejection, setApplyRejection] = useState<RelationalApplyRejection | null>(null);
  const slots = useCanvasRelationalOperandSlots();
  const { resetOperands, replaceInputs } = slots;
  const reset = useCallback(() => {
    setActive(false);
    setOperation(null);
    resetOperands();
    setJoinDraft(null);
    setAppendInputId(null);
    setApplyRejection(null);
  }, [resetOperands]);
  const hydrate = useCallback(
    (seed: CanvasRelationalTreeJoinSeedHydration) => {
      setActive(true);
      replaceInputs(seed.inputIds);
      setOperation(seed.operation);
      setJoinDraft(seed.draft);
      setAppendInputId(seed.appendInputId);
    },
    [replaceInputs]
  );
  return {
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
    hydrate,
  };
}
