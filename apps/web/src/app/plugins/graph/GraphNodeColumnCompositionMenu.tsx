/** Owned concern: choose an admitted function after a centre field drop. */
import type { ReactElement } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import type { GraphNodeColumn, GraphNodeColumnFunction } from './graphNodeColumnContracts';
import type { GraphNodeColumnCopy } from './GraphNodeColumnPiece';
import { graphNodeColumnClasses } from './graphVisualTokens';

export function GraphNodeColumnCompositionMenu(props: {
  sourceColumn: GraphNodeColumn;
  targetColumn: GraphNodeColumn;
  compatibleFunctions: readonly GraphNodeColumnFunction[];
  copy: GraphNodeColumnCopy;
  onOpenChange: (open: boolean) => void;
  onRequest: (capabilityId: string) => void;
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
            onSelect={props.onStructuredRequest}
          >
            {props.structuredFieldLabel}
          </DropdownMenuItem>
          {props.compatibleFunctions.length === 0 ? (
            <DropdownMenuItem disabled>
              {props.copy.noCompatibleColumnFunctionsLabel}
            </DropdownMenuItem>
          ) : (
            props.compatibleFunctions.map((item) => (
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
