/** Owned concern: render the canonical ResolveCanvasContextMenu column projection. */
import { useRef, useState, type ReactElement } from 'react';

import {
  buildCanvasColumnContextMenuModel,
  type CanvasColumnContextMenuAction,
} from '../../components/canvas/canvasNodeContextMenuModel';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from '../../components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger } from '../../components/ui/tooltip';
import type { GraphNodeColumn } from './graphNodeColumnContracts';
import type { GraphNodeColumnCopy } from './GraphNodeColumnPiece';
import { graphNodeColumnClasses } from './graphVisualTokens';

type FunctionMenu = NonNullable<GraphNodeColumn['functionMenu']>;

function actionSlot(action: CanvasColumnContextMenuAction): string | undefined {
  if (action.id === 'invoke-function') return 'graph-node-column-function';
  if (action.id === 'append-field') return 'graph-node-structured-field-append';
  if (action.id === 'remove-structured-field') return 'graph-node-structured-field-remove';
  return undefined;
}

export function GraphNodeColumnFunctionMenu(props: {
  nodeId: string;
  columnId: string;
  menu?: FunctionMenu;
  columnName: string;
  appendCandidates?: readonly GraphNodeColumn[];
  copy: GraphNodeColumnCopy;
  keyboardOpen: boolean;
  onKeyboardOpenChange: (open: boolean) => void;
  onRequest?: (capabilityId: string) => void;
  onStructuredAppend?: (column: GraphNodeColumn) => void;
  onStructuredRemove?: () => void;
  piece: ReactElement;
  tooltip: ReactElement;
}): ReactElement {
  const pendingPointerFunction = useRef<string | null>(null);
  const pendingKeyboardFunction = useRef<string | null>(null);
  const categoryLabel =
    props.menu == null
      ? props.copy.columnActionsLabelTemplate.replace('{column}', props.columnName)
      : props.copy.columnFunctionCategoryLabels[props.menu.category];
  const expressionItems = props.menu?.items ?? [];
  const model = buildCanvasColumnContextMenuModel({
    target: {
      kind: 'column',
      nodeId: props.nodeId,
      columnId: props.columnId,
      columnName: props.columnName,
    },
    label: categoryLabel,
    functions:
      props.onRequest == null
        ? []
        : expressionItems.map((item) => ({
            id: item.capabilityId,
            label: item.name.toUpperCase(),
          })),
    appendFields:
      props.onStructuredAppend == null
        ? []
        : (props.appendCandidates ?? []).map((column) => ({
            id: column.id ?? column.name,
            label: props.copy.appendColumnLabelTemplate.replace('{column}', column.name),
          })),
    removeStructuredFieldLabel:
      props.onStructuredRemove == null ? undefined : props.copy.removeStructuredFieldLabel,
    unavailableLabel:
      props.menu == null
        ? props.copy.noColumnActionsLabel
        : props.copy.noCompatibleColumnFunctionsLabel,
  });
  const selectAction = (action: CanvasColumnContextMenuAction, channel: 'pointer' | 'keyboard') => {
    if (action.disabled) return;
    if (action.id === 'invoke-function') {
      if (channel === 'pointer') pendingPointerFunction.current = action.targetId;
      else pendingKeyboardFunction.current = action.targetId;
      return;
    }
    if (action.id === 'append-field') {
      const column = props.appendCandidates?.find(
        (candidate) => (candidate.id ?? candidate.name) === action.targetId
      );
      if (column != null) props.onStructuredAppend?.(column);
      return;
    }
    if (action.id === 'remove-structured-field') props.onStructuredRemove?.();
  };
  const [pointerOpen, setPointerOpen] = useState(false);
  const applyPendingFunction = (pendingFunction: { current: string | null }, event: Event) => {
    const capabilityId = pendingFunction.current;
    if (capabilityId == null) return;
    pendingFunction.current = null;
    event.preventDefault();
    requestAnimationFrame(() => props.onRequest?.(capabilityId));
  };

  return (
    <Tooltip>
      <ContextMenu
        onOpenChange={(open) => {
          if (open) setPointerOpen(true);
        }}
      >
        <ContextMenuTrigger asChild>
          <TooltipTrigger asChild>{props.piece}</TooltipTrigger>
        </ContextMenuTrigger>
        {pointerOpen ? (
          <ContextMenuContent
            data-slot="graph-node-column-function-menu"
            onCloseAutoFocus={(event) => {
              applyPendingFunction(pendingPointerFunction, event);
              setPointerOpen(false);
            }}
          >
            <ContextMenuLabel>{model.label}</ContextMenuLabel>
            <ContextMenuGroup>
              {model.actions.map((action) => (
                <ContextMenuItem
                  key={action.id + ('targetId' in action ? ':' + action.targetId : '')}
                  data-slot={actionSlot(action)}
                  data-capability-id={action.id === 'invoke-function' ? action.targetId : undefined}
                  data-field-id={action.id === 'append-field' ? action.targetId : undefined}
                  disabled={action.disabled}
                  onSelect={() => selectAction(action, 'pointer')}
                >
                  {action.label}
                </ContextMenuItem>
              ))}
            </ContextMenuGroup>
          </ContextMenuContent>
        ) : null}
      </ContextMenu>
      <DropdownMenu open={props.keyboardOpen} onOpenChange={props.onKeyboardOpenChange}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className={graphNodeColumnClasses.keyboardMenuAnchor}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          data-slot="graph-node-column-function-menu"
          side="right"
          align="start"
          onCloseAutoFocus={(event) => applyPendingFunction(pendingKeyboardFunction, event)}
        >
          <DropdownMenuLabel>{model.label}</DropdownMenuLabel>
          <DropdownMenuGroup>
            {model.actions.map((action) => (
              <DropdownMenuItem
                key={action.id + ('targetId' in action ? ':' + action.targetId : '')}
                data-slot={actionSlot(action)}
                data-capability-id={action.id === 'invoke-function' ? action.targetId : undefined}
                data-field-id={action.id === 'append-field' ? action.targetId : undefined}
                disabled={action.disabled}
                onSelect={() => selectAction(action, 'keyboard')}
              >
                {action.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {props.tooltip}
    </Tooltip>
  );
}
