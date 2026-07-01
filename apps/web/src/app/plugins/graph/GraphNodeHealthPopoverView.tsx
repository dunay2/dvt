/** Owned concern: render graph-node operational health details from a resolved detail model. */
import type { CSSProperties, KeyboardEvent, ReactElement } from 'react';

import { cn } from '../../components/ui/utils';
import type { GraphNodeOperationalDetail } from './graphNodeCardStrategyContracts';
import { graphNodeHealthPopoverClasses } from './graphVisualTokens';

export type GraphNodeHealthPopoverViewProps = Readonly<{
  detail: GraphNodeOperationalDetail;
  position: Readonly<{
    x: number;
    y: number;
  }>;
  onClose: () => void;
}>;

function buildPopoverStyle(position: GraphNodeHealthPopoverViewProps['position']): CSSProperties {
  return {
    '--graph-node-health-popover-x': `${position.x}px`,
    '--graph-node-health-popover-y': `${position.y}px`,
    left: 'var(--graph-node-health-popover-x)',
    top: 'var(--graph-node-health-popover-y)',
  } as CSSProperties;
}

export function GraphNodeHealthPopoverView({
  detail,
  position,
  onClose,
}: GraphNodeHealthPopoverViewProps): ReactElement {
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
    }
  };

  return (
    <aside
      data-slot="graph-node-health-popover"
      role="dialog"
      aria-label={detail.title}
      tabIndex={-1}
      className={graphNodeHealthPopoverClasses.root}
      style={buildPopoverStyle(position)}
      onKeyDown={handleKeyDown}
    >
      <div className={graphNodeHealthPopoverClasses.title}>{detail.title}</div>
      <dl className={graphNodeHealthPopoverClasses.rows}>
        {detail.rows.map((row) => (
          <div key={row.id} className={graphNodeHealthPopoverClasses.row}>
            <dt className={graphNodeHealthPopoverClasses.label}>{row.label}</dt>
            <dd
              data-slot="graph-node-health-popover-value"
              {...(row.tone ? { 'data-tone': row.tone } : {})}
              className={cn(
                graphNodeHealthPopoverClasses.value,
                row.tone ? graphNodeHealthPopoverClasses.valueTone[row.tone] : null
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
