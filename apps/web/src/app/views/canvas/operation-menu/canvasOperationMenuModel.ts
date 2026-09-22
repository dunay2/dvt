/** Owned concern: adapt existing admission read models to grouped presentation items. */
import type {
  CanvasRelationalOperation,
  CanvasRelationalOperationChoice,
} from '../canvasRelationalOperationChoices';
import type { CanvasRelationalOperatorTool } from '../canvasRelationalTreeOperatorModel';
import { canvasRelationalAvailabilityLabel } from '../DvtRelationalOperationChooser';
import {
  canvasRelationalUnaryPresentation,
  resolveCanvasRelationalOperationPresentation,
  type CanvasRelationalOperationPresentation,
} from '../canvasRelationalOperationPresentation';
import type { CanvasRelationalTreeWorkbenchCopy } from '../canvasRelationalTreeWorkbench.types';
import type { CanvasOperationMenuCopy } from './canvasOperationMenuCopy';

export type CanvasMenuOperation = CanvasRelationalOperation | CanvasRelationalOperatorTool['id'];
export type CanvasOperationMenuGroup = 'combine' | 'transform' | 'order';
export type CanvasOperationMenuItem = Readonly<{
  id: CanvasMenuOperation;
  label: string;
  group: CanvasOperationMenuGroup;
  reason: string | null;
  selectable: boolean;
  active: boolean;
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
    tools: readonly CanvasRelationalOperatorTool[];
    operation: CanvasRelationalOperation | null;
    editable: boolean;
    copy: CanvasRelationalTreeWorkbenchCopy;
    menuCopy: CanvasOperationMenuCopy;
  }>
): readonly CanvasOperationMenuItem[] {
  const item = (
    id: CanvasMenuOperation,
    selectable: boolean,
    active: boolean,
    reason: string | null,
    draggable = false
  ): CanvasOperationMenuItem => {
    const presentation = resolveCanvasRelationalOperationPresentation(id);
    return {
      id,
      label: args.copy[presentation.labelKey],
      group: groups[presentation.category]!,
      selectable,
      active,
      reason,
      draggable,
    };
  };
  return [
    ...args.choices.map((choice) =>
      item(
        choice.operation,
        args.editable && choice.selectable,
        args.operation === choice.operation,
        !args.editable
          ? args.copy.inspectorDvtRelationalReadOnly
          : choice.availability === 'available'
            ? null
            : canvasRelationalAvailabilityLabel(choice.availability, args.copy),
        args.editable && choice.selectable && args.operation == null
      )
    ),
    ...Object.keys(canvasRelationalUnaryPresentation)
      .filter(
        (id): id is CanvasRelationalOperatorTool['id'] => id !== 'read' && id !== 'unsupported'
      )
      .map((id) => {
        const tool = args.tools.find((candidate) => candidate.id === id);
        return item(
          id,
          args.editable && tool?.enabled === true,
          tool?.active === true,
          !args.editable
            ? args.copy.inspectorDvtRelationalReadOnly
            : tool == null
              ? args.menuCopy.needsOutput
              : !tool.enabled
                ? args.menuCopy.unavailable
                : null
        );
      }),
  ];
}
