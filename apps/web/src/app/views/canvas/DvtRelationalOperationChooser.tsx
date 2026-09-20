/** Owned concern: present admitted relational-operation choices without changing semantic state. */
import { Button } from '../../components/ui/button';
import { Layers3, Columns3 } from 'lucide-react';
import { CanvasRelationalJoinIcon } from './CanvasRelationalJoinIcon';
import type {
  CanvasRelationalOperation,
  CanvasRelationalOperationChoice,
} from './canvasRelationalOperationChoices';
import { canvasViewCopy } from './copy';
import type { CanvasRelationalTreeWorkbenchCopy } from './canvasRelationalTreeWorkbench.types';
import { writeCanvasRelationalOperationDrag } from './canvasRelationalTreeDrag';

type RelationalOperationCopy = Pick<
  CanvasRelationalTreeWorkbenchCopy,
  | 'inspectorDvtSubstraitInnerJoinAction'
  | 'inspectorDvtSubstraitLeftJoinAction'
  | 'inspectorDvtSubstraitRightJoinAction'
  | 'inspectorDvtSubstraitFullOuterJoinAction'
  | 'inspectorDvtSubstraitLeftSemiJoinAction'
  | 'inspectorDvtSubstraitLeftAntiJoinAction'
  | 'inspectorDvtSubstraitRightSemiJoinAction'
  | 'inspectorDvtSubstraitRightAntiJoinAction'
  | 'inspectorDvtSubstraitCrossJoinAction'
  | 'inspectorDvtSubstraitUnionAllAction'
  | 'inspectorDvtSubstraitUnionDistinctAction'
  | 'inspectorDvtSubstraitIntersectDistinctAction'
  | 'inspectorDvtSubstraitExceptDistinctAction'
  | 'inspectorDvtSubstraitIntersectAllAction'
  | 'inspectorDvtSubstraitExceptAllAction'
  | 'relationalTreeProjectOperationLabel'
  | 'inspectorDvtRelationalAvailable'
  | 'inspectorDvtRelationalNeedsPredicate'
  | 'inspectorDvtRelationalNeedsSchemaAlignment'
  | 'inspectorDvtRelationalTargetUnavailable'
  | 'inspectorDvtRelationalUnavailable'
  | 'inspectorDvtRelationalReadOnly'
  | 'relationalTreeSelectNextSourceMessage'
>;

export function canvasRelationalOperationLabel(
  operation: CanvasRelationalOperation,
  copy: RelationalOperationCopy = canvasViewCopy
): string {
  switch (operation) {
    case 'projection':
      return copy.relationalTreeProjectOperationLabel;
    case 'inner_join':
      return copy.inspectorDvtSubstraitInnerJoinAction;
    case 'left_join':
      return copy.inspectorDvtSubstraitLeftJoinAction;
    case 'right_join':
      return copy.inspectorDvtSubstraitRightJoinAction;
    case 'full_outer_join':
      return copy.inspectorDvtSubstraitFullOuterJoinAction;
    case 'left_semi_join':
      return copy.inspectorDvtSubstraitLeftSemiJoinAction;
    case 'left_anti_join':
      return copy.inspectorDvtSubstraitLeftAntiJoinAction;
    case 'right_semi_join':
      return copy.inspectorDvtSubstraitRightSemiJoinAction;
    case 'right_anti_join':
      return copy.inspectorDvtSubstraitRightAntiJoinAction;
    case 'cross_join':
      return copy.inspectorDvtSubstraitCrossJoinAction;
    case 'union_all':
      return copy.inspectorDvtSubstraitUnionAllAction;
    case 'union_distinct':
      return copy.inspectorDvtSubstraitUnionDistinctAction;
    case 'intersect_distinct':
      return copy.inspectorDvtSubstraitIntersectDistinctAction;
    case 'except_distinct':
      return copy.inspectorDvtSubstraitExceptDistinctAction;
    case 'intersect_all':
      return copy.inspectorDvtSubstraitIntersectAllAction;
    case 'except_all':
      return copy.inspectorDvtSubstraitExceptAllAction;
  }
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
    case 'needs-input':
      return copy.relationalTreeSelectNextSourceMessage;
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
  layout = 'stack',
  selectedOperation = null,
}: Readonly<{
  choices: readonly CanvasRelationalOperationChoice[];
  onSelect: (operation: CanvasRelationalOperation) => void;
  copy?: RelationalOperationCopy;
  layout?: 'stack' | 'shelf';
  selectedOperation?: CanvasRelationalOperation | null;
}>): JSX.Element {
  return (
    <div
      data-slot="dvt-relational-operation-chooser"
      className={layout === 'shelf' ? 'flex flex-wrap gap-2' : 'grid gap-2'}
    >
      {choices.map((choice) => (
        <Button
          key={choice.operation}
          type="button"
          variant="outline"
          disabled={!choice.selectable}
          aria-pressed={selectedOperation === choice.operation}
          draggable={choice.selectable && selectedOperation == null}
          className={
            layout === 'shelf'
              ? 'h-8 gap-2 px-2.5 text-sm font-medium aria-pressed:border-(--status-info) aria-pressed:bg-blue-950/40'
              : 'h-auto min-w-40 justify-between gap-3 py-2 aria-pressed:border-(--status-info) aria-pressed:bg-blue-950/40'
          }
          title={canvasRelationalAvailabilityLabel(choice.availability, copy)}
          data-slot={`dvt-select-operation-${choice.operation.replaceAll('_', '-')}`}
          onDragStart={(event) => {
            if (!choice.selectable || selectedOperation != null) {
              event.preventDefault();
              return;
            }
            writeCanvasRelationalOperationDrag(event.dataTransfer, choice.operation);
          }}
          onClick={() => onSelect(choice.operation)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            onSelect(choice.operation);
          }}
        >
          {layout !== 'shelf' ? null : choice.operation === 'inner_join' ||
            choice.operation === 'left_join' ||
            choice.operation === 'right_join' ||
            choice.operation === 'full_outer_join' ||
            choice.operation === 'left_semi_join' ||
            choice.operation === 'left_anti_join' ||
            choice.operation === 'right_semi_join' ||
            choice.operation === 'right_anti_join' ||
            choice.operation === 'cross_join' ? (
            <CanvasRelationalJoinIcon aria-hidden="true" className="size-4" />
          ) : choice.operation === 'union_all' ||
            choice.operation === 'union_distinct' ||
            choice.operation === 'intersect_distinct' ||
            choice.operation === 'except_distinct' ||
            choice.operation === 'intersect_all' ||
            choice.operation === 'except_all' ? (
            <Layers3 aria-hidden="true" className="size-4" />
          ) : (
            <Columns3 aria-hidden="true" className="size-4" />
          )}
          <span>{canvasRelationalOperationLabel(choice.operation, copy)}</span>
          <span className={layout === 'shelf' ? 'sr-only' : 'text-xs font-normal opacity-70'}>
            {canvasRelationalAvailabilityLabel(choice.availability, copy)}
          </span>
        </Button>
      ))}
    </div>
  );
}
