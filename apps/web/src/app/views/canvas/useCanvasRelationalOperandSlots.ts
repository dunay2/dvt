/** Owned concern: maintain ordered operand-slot identities for one discardable session. */
import { useCallback, useState } from 'react';
export function useCanvasRelationalOperandSlots() {
  const [selectedInputIds, replaceInputs] = useState<readonly string[]>([]);
  const resetOperands = useCallback(() => replaceInputs([]), []);
  const appendInput = useCallback(
    (nodeId: string) => replaceInputs((current) => [...current, nodeId]),
    []
  );
  return {
    appendInput,
    resetOperands,
    replaceInputs,
    selectedInputIds,
  } as const;
}
