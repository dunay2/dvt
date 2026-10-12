/** Owned concern: maintain ordered operand-slot identities for one discardable session. */
import { useCallback, useState } from 'react';
export function useCanvasRelationalOperandSlots() {
  const [selectedInputIds, replaceInputs] = useState<readonly string[]>([]);
  const resetOperands = useCallback(() => replaceInputs([]), []);
  return {
    resetOperands,
    replaceInputs,
    selectedInputIds,
  } as const;
}
