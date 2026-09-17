/** Owned concern: maintain ordered operand-slot identities for one discardable session. */
import { useCallback, useMemo, useState } from 'react';

import type { CanvasRelationalOperandPosition } from './CanvasRelationalTreeOperandSlot';

export function useCanvasRelationalOperandSlots() {
  const [primaryInputId, setPrimaryInputId] = useState<string | null>(null);
  const [secondaryInputId, setSecondaryInputId] = useState<string | null>(null);
  const [additionalInputIds, setAdditionalInputIds] = useState<readonly string[]>([]);
  const selectedInputIds = useMemo(
    () =>
      [primaryInputId, secondaryInputId, ...additionalInputIds].filter(
        (nodeId): nodeId is string => nodeId != null
      ),
    [additionalInputIds, primaryInputId, secondaryInputId]
  );
  const resetOperands = useCallback(() => {
    setPrimaryInputId(null);
    setSecondaryInputId(null);
    setAdditionalInputIds([]);
  }, []);
  const selectInitialInput = useCallback(
    (nodeId: string) => {
      if (primaryInputId == null) setPrimaryInputId(nodeId);
      else if (primaryInputId !== nodeId && secondaryInputId == null) setSecondaryInputId(nodeId);
    },
    [primaryInputId, secondaryInputId]
  );
  const placeInput = useCallback(
    (nodeId: string, position: CanvasRelationalOperandPosition) => {
      if (position === 'primary') {
        setPrimaryInputId(nodeId);
        if (secondaryInputId === nodeId) setSecondaryInputId(null);
      } else {
        setSecondaryInputId(nodeId);
        if (primaryInputId === nodeId) setPrimaryInputId(null);
      }
      setAdditionalInputIds([]);
    },
    [primaryInputId, secondaryInputId]
  );
  const appendInput = useCallback(
    (nodeId: string) => setAdditionalInputIds((current) => [...current, nodeId]),
    []
  );
  const replaceInputs = useCallback((nodeIds: readonly string[]) => {
    setPrimaryInputId(nodeIds[0] ?? null);
    setSecondaryInputId(nodeIds[1] ?? null);
    setAdditionalInputIds(nodeIds.slice(2));
  }, []);
  return {
    appendInput,
    placeInput,
    primaryInputId,
    resetOperands,
    replaceInputs,
    secondaryInputId,
    selectedInputIds,
    selectInitialInput,
  } as const;
}
