/** Owned concern: offer explicit structured-field composition after a centre field drop. */
import type { ReactElement } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import type { GraphNodeColumn } from './graphNodeColumnContracts';
import { graphNodeColumnClasses } from './graphColumnVisualTokens';

export function GraphNodeColumnCompositionMenu(props: {
  sourceColumn: GraphNodeColumn;
  targetColumn: GraphNodeColumn;
  onOpenChange: (open: boolean) => void;
  structuredFieldLabel: string;
  onStructuredRequest: () => void;
}): ReactElement {
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
      >
        <DropdownMenuLabel>
          {props.targetColumn.name} → {props.sourceColumn.name}
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem
            data-slot="graph-node-column-composition-structured-field"
            onSelect={() => requestAnimationFrame(() => props.onStructuredRequest())}
          >
            {props.structuredFieldLabel}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
