/** Owned concern: render the canonical ResolveCanvasContextMenu column projection. */
import { useState, type ReactElement } from 'react';

import {
  buildCanvasColumnContextMenuModel,
  type CanvasColumnContextMenuAction,
} from '../../components/canvas/canvasNodeContextMenuModel';
import { usePointerGraceDismiss } from '../../components/transientSurface/usePointerGraceDismiss';
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
type PointerMenuSession = Readonly<{ key: number; open: boolean }>;

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
  const categoryLabel =
    props.menu == null
      ? props.copy.columnActionsLabelTemplate.replace('{column}', props.columnName)
      : props.copy.columnFunctionCategoryLabels[props.menu.category];
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
        : (props.menu?.items ?? []).map((item) => ({
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
  const selectAction = (action: CanvasColumnContextMenuAction) => {
    if (action.disabled) return;
    if (action.id === 'invoke-function') {
      props.onRequest?.(action.targetId);
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
  const [pointerSession, setPointerSession] = useState<PointerMenuSession>({ key: 0, open: false });
  const pointerGraceProps = usePointerGraceDismiss({
    enabled: pointerSession.open,
    onDismiss: () => setPointerSession((session) => ({ key: session.key + 1, open: false })),
  });

  return (
    <Tooltip>
      <ContextMenu
        key={pointerSession.key}
        onOpenChange={(open) => setPointerSession((session) => ({ ...session, open }))}
      >
        <ContextMenuTrigger asChild>
          <TooltipTrigger asChild>{props.piece}</TooltipTrigger>
        </ContextMenuTrigger>
        {pointerSession.open ? (
          <ContextMenuContent data-slot="graph-node-column-function-menu" {...pointerGraceProps}>
            <ContextMenuLabel>{model.label}</ContextMenuLabel>
            <ContextMenuGroup>
              {model.actions.map((action) => (
                <ContextMenuItem
                  key={action.id + ('targetId' in action ? ':' + action.targetId : '')}
                  data-slot={actionSlot(action)}
                  data-capability-id={action.id === 'invoke-function' ? action.targetId : undefined}
                  data-field-id={action.id === 'append-field' ? action.targetId : undefined}
                  disabled={action.disabled}
                  onSelect={() => selectAction(action)}
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
        <DropdownMenuContent data-slot="graph-node-column-function-menu" side="right" align="start">
          <DropdownMenuLabel>{model.label}</DropdownMenuLabel>
          <DropdownMenuGroup>
            {model.actions.map((action) => (
              <DropdownMenuItem
                key={action.id + ('targetId' in action ? ':' + action.targetId : '')}
                data-slot={actionSlot(action)}
                data-capability-id={action.id === 'invoke-function' ? action.targetId : undefined}
                data-field-id={action.id === 'append-field' ? action.targetId : undefined}
                disabled={action.disabled}
                onSelect={() => selectAction(action)}
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
