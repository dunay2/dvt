/** Owned concern: adapt existing admission read models to grouped presentation items. */
import type { CanvasRelationalOperationChoice } from '../canvasRelationalOperationChoices';
import type { CanvasStagedOperationKind } from '../canvasStagedOperation';
import {
  canvasRelationalAvailabilityLabel,
  resolveCanvasRelationalOperationPresentation,
  type CanvasRelationalOperationPresentation,
} from '../canvasRelationalOperationPresentation';
import type { CanvasRelationalTreeWorkbenchCopy } from '../canvasRelationalTreeWorkbench.types';
import { selectedUnaryToolIds } from '../canvasSelectedRelationTools';

export type CanvasMenuOperation = CanvasStagedOperationKind;
export type CanvasOperationMenuGroup = 'combine' | 'transform' | 'order';
export type CanvasOperationMenuItem = Readonly<{
  id: CanvasMenuOperation;
  label: string;
  group: CanvasOperationMenuGroup;
  reason: string | null;
  draggable: boolean;
}>;
const groups = {
  read: null,
  unsupported: null,
  join: 'combine',
  cross: 'combine',
  set: 'combine',
  project: 'transform',
  filter: 'transform',
  aggregate: 'transform',
  window: 'transform',
  sort: 'order',
  fetch: 'order',
} as const satisfies Record<
  CanvasRelationalOperationPresentation['category'],
  CanvasOperationMenuGroup | null
>;

export function buildCanvasOperationMenuItems(
  args: Readonly<{
    choices: readonly CanvasRelationalOperationChoice[];
    editable: boolean;
    copy: CanvasRelationalTreeWorkbenchCopy;
  }>
): readonly CanvasOperationMenuItem[] {
  const item = (
    id: CanvasMenuOperation,
    reason: string | null,
    draggable = false
  ): CanvasOperationMenuItem => {
    const presentation = resolveCanvasRelationalOperationPresentation(id);
    return {
      id,
      label: args.copy[presentation.labelKey],
      group: groups[presentation.category]!,
      reason,
      draggable,
    };
  };
  return [
    ...args.choices.map((choice) =>
      item(
        choice.operation,
        !args.editable
          ? args.copy.inspectorDvtRelationalReadOnly
          : choice.availability === 'available'
            ? null
            : canvasRelationalAvailabilityLabel(choice.availability, args.copy),
        args.editable &&
          choice.availability !== 'read-only' &&
          choice.availability !== 'semantically-unavailable' &&
          choice.availability !== 'target-unavailable'
      )
    ),
    item(
      'field_transform',
      !args.editable ? args.copy.inspectorDvtRelationalReadOnly : null,
      args.editable &&
        args.choices.some(
          (choice) => choice.operation === 'projection' && choice.availability === 'available'
        )
    ),
    ...selectedUnaryToolIds.map((id) =>
      item(id, !args.editable ? args.copy.inspectorDvtRelationalReadOnly : null, args.editable)
    ),
  ];
}
