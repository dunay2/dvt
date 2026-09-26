/** Owned concern: own the discardable relation draft and reset/hydrate it atomically. */
import { useCallback, useState } from 'react';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { RelationalApplyRejection } from './canvasRelationalTreeWorkbench.types';
import type { CanvasRelationalTreeSeedHydration } from './useCanvasRelationalTreeExistingSeed';
import { useCanvasRelationalOperandSlots } from './useCanvasRelationalOperandSlots';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import type { CanvasStagedOperation } from './canvasStagedOperation';

export function useCanvasRelationalTreeDraftState() {
  const [operation, setOperation] = useState<CanvasRelationalOperation | null>(null);
  const [active, setActive] = useState(false);
  const [joinDraft, setJoinDraft] = useState<SubstraitDocument | null>(null);
  const [appendInputId, setAppendInputId] = useState<string | null>(null);
  const [appendTargetRelationId, setAppendTargetRelationId] = useState<string | null>(null);
  const [pendingSources, setPendingSources] = useState<readonly PendingSourceOccurrence[]>([]);
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(null);
  const [stagedOperations, setStagedOperations] = useState<readonly CanvasStagedOperation[]>([]);
  const [selectedStagedOperationId, setSelectedStagedOperationId] = useState<string | null>(null);
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
    setAppendTargetRelationId(null);
    setPendingSources([]);
    setPendingSourceId(null);
    setStagedOperations([]);
    setSelectedStagedOperationId(null);
    setApplyRejection(null);
  }, [resetOperands]);
  const hydrate = useCallback(
    (seed: CanvasRelationalTreeSeedHydration) => {
      setActive(true);
      replaceInputs(seed.inputIds);
      setOperation(seed.operation);
      setJoinDraft(seed.draft);
      setAppendInputId(seed.appendInputId);
      setAppendTargetRelationId(null);
      setStagedOperations([]);
      setSelectedStagedOperationId(null);
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
    appendTargetRelationId,
    setAppendTargetRelationId,
    pendingSources,
    setPendingSources,
    pendingSourceId,
    pendingSource:
      pendingSources.find((item) => item.read.binding.relationId === pendingSourceId) ?? null,
    setPendingSourceId,
    stagedOperations,
    setStagedOperations,
    selectedStagedOperationId,
    setSelectedStagedOperationId,
    consumePendingSource,
    clear: () => {
      setActive(true);
      setOperation(null);
      resetOperands();
      setJoinDraft(null);
      setAppendInputId(null);
      setAppendTargetRelationId(null);
      setPendingSourceId(null);
      setStagedOperations([]);
      setSelectedStagedOperationId(null);
      setApplyRejection(null);
    },
    applyRejection,
    setApplyRejection,
    reset,
    hydrate,
  };
}
