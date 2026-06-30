/** Owned concern: render graph-node status chip from an already-projected status model. */
import type { ReactElement } from 'react';

import { cn } from '../../components/ui/utils';
import type { GraphNodeCardStatus } from './graphNodeCardStrategyContracts';
import { graphNodeStatusChipClasses, graphVisualClasses } from './graphVisualTokens';

export type GraphNodeStatusChipProps = Readonly<{
  status: GraphNodeCardStatus;
}>;

export function GraphNodeStatusChip({ status }: GraphNodeStatusChipProps): ReactElement {
  return (
    <span
      data-slot="graph-node-status-chip"
      className={cn(graphVisualClasses.nodeCardStatus, graphNodeStatusChipClasses[status.tone])}
    >
      {status.label}
    </span>
  );
}
