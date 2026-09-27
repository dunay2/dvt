/** Owned concern: own the discardable relation draft and reset/hydrate it atomically. */
import { useCallback, useState } from 'react';
import type { CanvasRelationalOperation } from './canvasRelationalOperationChoices';
import type { SubstraitDocument } from '@dvt/substrait-analysis';
import type { RelationalApplyRejection } from './canvasRelationalTreeWorkbench.types';
import type { CanvasRelationalTreeSeedHydration } from './useCanvasRelationalTreeExistingSeed';
import { useCanvasRelationalOperandSlots } from './useCanvasRelationalOperandSlots';
import type { PendingSourceOccurrence } from './relational-source-occurrence/pendingSourceOccurrence';
import type { CanvasStagedOperation } from './canvasStagedOperation';
import { indexSubstraitRelations } from '@dvt/substrait-analysis';
import type { CardPosition } from './canvasRelationalTreeGeometry';

export function useCanvasRelationalTreeDraftState() {
  const [operation, setOperation] = useState<CanvasRelationalOperation | null>(null);
  const [active, setActive] = useState(false);
  const [joinDraft, setJoinDraft] = useState<SubstraitDocument | null>(null);
  const [pendingSources, setPendingSources] = useState<readonly PendingSourceOccurrence[]>([]);
  const [pendingSourceId, setPendingSourceId] = useState<string | null>(null);
  const [stagedOperations, setStagedOperations] = useState<readonly CanvasStagedOperation[]>([]);
  const [selectedStagedOperationId, setSelectedStagedOperationId] = useState<string | null>(null);
  const [outputRelationId, setOutputRelationId] = useState<string | null>(null);
  const [positions, setPositions] = useState<ReadonlyMap<string, CardPosition>>(() => new Map());
  const [applyRejection, setApplyRejection] = useState<RelationalApplyRejection | null>(null);
  const slots = useCanvasRelationalOperandSlots();
  const { resetOperands, replaceInputs } = slots;
  const reset = useCallback(() => {
    setActive(false);
    setOperation(null);
    resetOperands();
    setJoinDraft(null);
    setPendingSources([]);
    setPendingSourceId(null);
    setStagedOperations([]);
    setSelectedStagedOperationId(null);
    setOutputRelationId(null);
    setPositions(new Map());
    setApplyRejection(null);
  }, [resetOperands]);
  const hydrate = useCallback(
    (seed: CanvasRelationalTreeSeedHydration) => {
      setActive(true);
      replaceInputs(seed.inputIds);
      setOperation(seed.operation);
      setJoinDraft(seed.draft);
      setStagedOperations([]);
      setSelectedStagedOperationId(null);
      const indexed = indexSubstraitRelations(seed.draft);
      setOutputRelationId(indexed.ok ? indexed.index.rootId : null);
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
    pendingSources,
    setPendingSources,
    pendingSourceId,
    setPendingSourceId,
    stagedOperations,
    setStagedOperations,
    selectedStagedOperationId,
    setSelectedStagedOperationId,
    outputRelationId,
    setOutputRelationId,
    positions,
    setPositions,
    restoreIncomplete: useCallback(
      (
        draft: Readonly<{
          sources: readonly PendingSourceOccurrence[];
          operations: readonly CanvasStagedOperation[];
          outputRelationId: string | null;
          positions: ReadonlyMap<string, CardPosition>;
        }>
      ) => {
        setActive(true);
        setPendingSources(draft.sources);
        setPendingSourceId(null);
        setStagedOperations(draft.operations);
        setSelectedStagedOperationId(null);
        setOutputRelationId(draft.outputRelationId);
        setPositions(draft.positions);
      },
      []
    ),
    clear: () => {
      setActive(true);
      setOperation(null);
      resetOperands();
      setJoinDraft(null);
      setPendingSourceId(null);
      setStagedOperations([]);
      setSelectedStagedOperationId(null);
      setOutputRelationId(null);
      setPositions(new Map());
      setApplyRejection(null);
    },
    applyRejection,
    setApplyRejection,
    reset,
    hydrate,
  };
}
