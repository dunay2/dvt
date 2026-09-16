/** Owned concern: present admitted relational-operation choices without changing semantic state. */
import { Button } from '../../components/ui/button';
import type {
  CanvasRelationalOperation,
  CanvasRelationalOperationChoice,
} from './canvasRelationalOperationChoices';
import { canvasViewCopy } from './copy';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';

type RelationalOperationCopy = Pick<
  CanvasRelationalTreeWorkbenchCopy,
  | 'inspectorDvtSubstraitInnerJoinAction'
  | 'inspectorDvtSubstraitUnionAllAction'
  | 'inspectorDvtRelationalAvailable'
  | 'inspectorDvtRelationalNeedsPredicate'
  | 'inspectorDvtRelationalNeedsSchemaAlignment'
  | 'inspectorDvtRelationalTargetUnavailable'
  | 'inspectorDvtRelationalUnavailable'
  | 'inspectorDvtRelationalReadOnly'
>;

export function canvasRelationalOperationLabel(
  operation: CanvasRelationalOperation,
  copy: RelationalOperationCopy = canvasViewCopy
): string {
  return operation === 'inner_join'
    ? copy.inspectorDvtSubstraitInnerJoinAction
    : copy.inspectorDvtSubstraitUnionAllAction;
}

export function canvasRelationalAvailabilityLabel(
  availability: CanvasRelationalOperationChoice['availability'],
  copy: RelationalOperationCopy = canvasViewCopy
): string {
  switch (availability) {
    case 'available':
      return copy.inspectorDvtRelationalAvailable;
    case 'needs-predicate':
      return copy.inspectorDvtRelationalNeedsPredicate;
    case 'needs-schema-alignment':
      return copy.inspectorDvtRelationalNeedsSchemaAlignment;
    case 'target-unavailable':
      return copy.inspectorDvtRelationalTargetUnavailable;
    case 'read-only':
      return copy.inspectorDvtRelationalReadOnly;
    case 'semantically-unavailable':
      return copy.inspectorDvtRelationalUnavailable;
  }
}

export function DvtRelationalOperationChooser({
  choices,
  onSelect,
  copy = canvasViewCopy,
}: Readonly<{
  choices: readonly CanvasRelationalOperationChoice[];
  onSelect: (operation: CanvasRelationalOperation) => void;
  copy?: RelationalOperationCopy;
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
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            onSelect(choice.operation);
          }}
        >
          <span>{canvasRelationalOperationLabel(choice.operation, copy)}</span>
          <span className="text-[10px] font-normal opacity-70">
            {canvasRelationalAvailabilityLabel(choice.availability, copy)}
          </span>
        </Button>
      ))}
    </div>
  );
}
