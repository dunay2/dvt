/** Owned concern: own the discardable relation draft and reset/hydrate it atomically. */
import { useCallback, useState } from 'react';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { RelationalApplyRejection } from './canvasRelationalTreeWorkbench.types';
import type { CanvasRelationalTreeSeedHydration } from './useCanvasRelationalTreeExistingSeed';
import { useCanvasRelationalOperandSlots } from './useCanvasRelationalOperandSlots';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';

export function useCanvasRelationalTreeDraftState() {
  const [operation, setOperation] = useState<CanvasRelationalOperation | null>(null);
  const [active, setActive] = useState(false);
  const [joinDraft, setJoinDraft] = useState<SubstraitDocument | null>(null);
  const [appendInputId, setAppendInputId] = useState<string | null>(null);
  const [pendingSources, setPendingSources] = useState<readonly PendingSourceOccurrence[]>([]);
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(null);
  const [applyRejection, setApplyRejection] = useState<RelationalApplyRejection | null>(null);
  const slots = useCanvasRelationalOperandSlots();
  const { resetOperands, replaceInputs } = slots;
  const consumePendingSource = (id: string) => {
    setPendingSources((current) => current.filter((item) => item.read.binding.relationId !== id));
    setPendingSourceId(null);
  };
  const reset = useCallback(() => {
    setActive(false);
    setOperation(null);
    resetOperands();
    setJoinDraft(null);
    setAppendInputId(null);
    setPendingSources([]);
    setPendingSourceId(null);
    setApplyRejection(null);
  }, [resetOperands]);
  const hydrate = useCallback(
    (seed: CanvasRelationalTreeSeedHydration) => {
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
    pendingSources,
    setPendingSources,
    pendingSourceId,
    pendingSource:
      pendingSources.find((item) => item.read.binding.relationId === pendingSourceId) ?? null,
    setPendingSourceId,
    consumePendingSource,
    clear: () => {
      setActive(true);
      setOperation(null);
      resetOperands();
      setJoinDraft(null);
      setAppendInputId(null);
      setPendingSourceId(null);
      setApplyRejection(null);
    },
    applyRejection,
    setApplyRejection,
    reset,
    hydrate,
  };
}
