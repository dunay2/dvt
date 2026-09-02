/** Owned concern: choose an admitted function after a centre field drop. */
import type { ReactElement } from 'react';

import { usePointerGraceDismiss } from '../../components/transientSurface/usePointerGraceDismiss';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import type { GraphNodeColumn } from './graphNodeColumnContracts';
import type { GraphNodeColumnCopy } from './GraphNodeColumnPiece';
import { graphNodeColumnClasses } from './graphVisualTokens';

export function GraphNodeColumnCompositionMenu(props: {
  sourceColumn: GraphNodeColumn;
  targetColumn: GraphNodeColumn;
  copy: GraphNodeColumnCopy;
  onOpenChange: (open: boolean) => void;
  onRequest: (capabilityId: string) => void;
}): ReactElement {
  const menu = props.sourceColumn.functionMenu;
  const pointerGraceProps = usePointerGraceDismiss({
    enabled: true,
    onDismiss: () => props.onOpenChange(false),
  });

  return (
    <DropdownMenu open onOpenChange={props.onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className={graphNodeColumnClasses.compositionMenuAnchor}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-slot="graph-node-column-composition-menu"
        side="right"
        align="center"
        {...pointerGraceProps}
      >
        <DropdownMenuLabel>
          {props.sourceColumn.name} → {props.targetColumn.name}
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {menu == null || menu.items.length === 0 ? (
            <DropdownMenuItem disabled>
              {props.copy.noCompatibleColumnFunctionsLabel}
            </DropdownMenuItem>
          ) : (
            menu.items.map((item) => (
              <DropdownMenuItem
                key={item.capabilityId}
                data-slot="graph-node-column-composition-function"
                data-capability-id={item.capabilityId}
                onSelect={() => props.onRequest(item.capabilityId)}
              >
                {item.name.toUpperCase()}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
