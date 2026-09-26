/** Own the pending operation choice independently of the menu's presentation. */
import { useState } from 'react';
import type {
  CanvasRelationalOperation,
  CanvasRelationalOperationChoice,
} from '../canvasRelationalOperationChoices';
import type { CanvasRelationalOperatorTool } from '../relational-operator-form/OperatorTool';
import type { CanvasMenuOperation, CanvasOperationMenuItem } from './canvasOperationMenuModel';

export function useCanvasOperationMenuSelection({
  items,
  tools,
  choices,
  operation,
  targetId,
  onSelectOperation,
  onInsertTransform,
}: Readonly<{
  items: readonly CanvasOperationMenuItem[];
  tools: readonly CanvasRelationalOperatorTool[];
  choices: readonly CanvasRelationalOperationChoice[];
  operation: CanvasRelationalOperation | null;
  targetId?: string;
  onSelectOperation: (operation: CanvasRelationalOperation, relationId?: string) => void;
  onInsertTransform?: () => Promise<void>;
}>) {
  const [replacement, setReplacement] = useState<CanvasRelationalOperation | null>(null);
  const [selection, setSelection] = useState<{
    tool: CanvasRelationalOperatorTool;
    targetId?: string;
  } | null>(null);
  return {
    selection,
    replacement,
    cancelTool: () => setSelection(null),
    cancelReplacement: () => setReplacement(null),
    confirmReplacement: () => {
      if (replacement != null) onSelectOperation(replacement, targetId);
      setReplacement(null);
    },
    select: (next: CanvasMenuOperation) => {
      if (!items.some((item) => item.id === next && item.selectable)) return;
      if (next === 'field_transform') {
        void onInsertTransform?.();
        return;
      }
      const tool = tools.find((item) => item.id === next);
      if (tool != null) {
        setSelection({ tool, targetId });
        return;
      }
      const choice = choices.find((item) => item.operation === next);
      if (choice == null || choice.operation === operation) return;
      if (operation != null) setReplacement(choice.operation);
      else onSelectOperation(choice.operation, targetId);
    },
  };
}
