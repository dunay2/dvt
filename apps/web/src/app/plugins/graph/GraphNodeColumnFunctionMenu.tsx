/** Owned concern: expose admitted column functions through pointer and keyboard menus. */
import { useState, type ReactElement } from 'react';

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

export function GraphNodeColumnFunctionMenu(props: {
  menu: FunctionMenu;
  copy: GraphNodeColumnCopy;
  keyboardOpen: boolean;
  onKeyboardOpenChange: (open: boolean) => void;
  onApply: (capabilityId: string) => void;
  piece: ReactElement;
  tooltip: ReactElement;
}): ReactElement {
  const categoryLabel = props.copy.columnFunctionCategoryLabels[props.menu.category];
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
            <ContextMenuLabel>{categoryLabel}</ContextMenuLabel>
            <ContextMenuGroup>
              {props.menu.items.length === 0 ? (
                <ContextMenuItem disabled>
                  {props.copy.noCompatibleColumnFunctionsLabel}
                </ContextMenuItem>
              ) : (
                props.menu.items.map((item) => (
                  <ContextMenuItem
                    key={item.capabilityId}
                    data-slot="graph-node-column-function"
                    data-capability-id={item.capabilityId}
                    onSelect={() => props.onApply(item.capabilityId)}
                  >
                    {item.name.toUpperCase()}
                  </ContextMenuItem>
                ))
              )}
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
          <DropdownMenuLabel>{categoryLabel}</DropdownMenuLabel>
          <DropdownMenuGroup>
            {props.menu.items.length === 0 ? (
              <DropdownMenuItem disabled>
                {props.copy.noCompatibleColumnFunctionsLabel}
              </DropdownMenuItem>
            ) : (
              props.menu.items.map((item) => (
                <DropdownMenuItem
                  key={item.capabilityId}
                  data-slot="graph-node-column-function"
                  data-capability-id={item.capabilityId}
                  onSelect={() => props.onApply(item.capabilityId)}
                >
                  {item.name.toUpperCase()}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      {props.tooltip}
    </Tooltip>
  );
}
