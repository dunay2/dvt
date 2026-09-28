/** Owned concern: GraphNodeCardTitle. */

import { type ReactElement } from 'react';
import { cn } from '../../components/ui/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import type { GraphNodeCardReadModel } from './graphNodeCardStrategyContracts';
import {
  graphNodeCardLayoutClasses,
  graphNodeSourceIdentityTooltipClasses,
} from './graphCardVisualTokens';

export function GraphNodeCardTitle({
  cardModel,
}: {
  cardModel: GraphNodeCardReadModel;
}): ReactElement {
  const sourceIdentity = cardModel.sourceIdentity;
  if (sourceIdentity == null) {
    return (
      <span
        data-slot="graph-node-card-title"
        className={graphNodeCardLayoutClasses.title}
        title={cardModel.titleDetail ?? undefined}
      >
        {cardModel.title}
      </span>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          data-slot="graph-node-source-identity-trigger"
          tabIndex={0}
          aria-label={sourceIdentity.ariaLabel}
          className={cn(
            graphNodeCardLayoutClasses.title,
            graphNodeCardLayoutClasses.sourceIdentityTrigger
          )}
        >
          {cardModel.title}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={6}
        className={graphNodeSourceIdentityTooltipClasses.root}
      >
        <dl className={graphNodeSourceIdentityTooltipClasses.rows}>
          {sourceIdentity.rows.map((row) => (
            <div key={row.id} className={graphNodeSourceIdentityTooltipClasses.row}>
              <dt className={graphNodeSourceIdentityTooltipClasses.label}>{row.label}</dt>
              <dd className={graphNodeSourceIdentityTooltipClasses.value}>{row.value}</dd>
            </div>
          ))}
        </dl>
      </TooltipContent>
    </Tooltip>
  );
}
