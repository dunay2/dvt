/** Owned concern: render graph-node operational health details from a resolved detail model. */
import type { CSSProperties, KeyboardEvent, ReactElement } from 'react';

import type { GraphNodeOperationalDetail } from './graphNodeCardStrategyContracts';
import { graphVisualClasses } from './graphVisualTokens';

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
      className={graphVisualClasses.nodeHealthPopover}
      style={buildPopoverStyle(position)}
      onKeyDown={handleKeyDown}
    >
      <div className={graphVisualClasses.nodeHealthPopoverTitle}>{detail.title}</div>
      <dl className={graphVisualClasses.nodeHealthPopoverRows}>
        {detail.rows.map((row) => (
          <div key={row.id} className={graphVisualClasses.nodeHealthPopoverRow}>
            <dt className={graphVisualClasses.nodeHealthPopoverLabel}>{row.label}</dt>
            <dd className={graphVisualClasses.nodeHealthPopoverValue}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
