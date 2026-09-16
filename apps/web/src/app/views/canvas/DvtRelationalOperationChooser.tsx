/** Owned concern: present admitted relational-operation choices without changing semantic state. */
import { Button } from '../../components/ui/button';
import type {
  CanvasRelationalOperation,
  CanvasRelationalOperationChoice,
} from './canvasRelationalOperationChoices';
import { canvasViewCopy } from './copy';

function operationLabel(operation: CanvasRelationalOperation): string {
  return operation === 'inner_join'
    ? canvasViewCopy.inspectorDvtSubstraitInnerJoinAction
    : canvasViewCopy.inspectorDvtSubstraitUnionAllAction;
}

function availabilityLabel(choice: CanvasRelationalOperationChoice): string {
  switch (choice.availability) {
    case 'available':
      return canvasViewCopy.inspectorDvtRelationalAvailable;
    case 'needs-predicate':
      return canvasViewCopy.inspectorDvtRelationalNeedsPredicate;
    case 'needs-schema-alignment':
      return canvasViewCopy.inspectorDvtRelationalNeedsSchemaAlignment;
    case 'target-unavailable':
      return canvasViewCopy.inspectorDvtRelationalTargetUnavailable;
    case 'read-only':
      return canvasViewCopy.inspectorDvtRelationalReadOnly;
    case 'semantically-unavailable':
      return canvasViewCopy.inspectorDvtRelationalUnavailable;
  }
}

export function DvtRelationalOperationChooser({
  choices,
  onSelect,
}: Readonly<{
  choices: readonly CanvasRelationalOperationChoice[];
  onSelect: (operation: CanvasRelationalOperation) => void;
}>): JSX.Element {
  return (
    <div data-slot="dvt-relational-operation-chooser" className="grid gap-2">
      {choices.map((choice) => (
        <Button
          key={choice.operation}
          type="button"
          variant="outline"
          disabled={!choice.selectable}
          className="h-auto justify-between gap-3 py-2"
          data-slot={`dvt-select-operation-${choice.operation.replace('_', '-')}`}
          onClick={() => onSelect(choice.operation)}
        >
          <span>{operationLabel(choice.operation)}</span>
          <span className="text-[10px] font-normal opacity-70">{availabilityLabel(choice)}</span>
        </Button>
      ))}
    </div>
  );
}
