/** Owned concern: render graph-node operational health details from a resolved detail model. */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
} from 'react';

import { cn } from '../../components/ui/utils';
import type { GraphNodeOperationalDetail } from './graphNodeCardStrategyContracts';
import { graphNodeHealthPopoverClasses } from './graphVisualTokens';

export type GraphNodeHealthPopoverViewProps = Readonly<{
  detail: GraphNodeOperationalDetail;
  position: Readonly<{
    x: number;
    y: number;
  }>;
  onClose: (reason: 'escape') => void;
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
  const popoverRef = useRef<HTMLElement>(null);
  const [positionCorrection, setPositionCorrection] = useState({ x: 0, y: 0 });

  useEffect(() => {
    popoverRef.current?.focus();
  }, [detail]);

  useLayoutEffect(() => {
    const popover = popoverRef.current;
    const container = popover?.offsetParent;
    if (!(popover instanceof HTMLElement) || !(container instanceof HTMLElement)) {
      return;
    }
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      return;
    }
    const margin = 8;
    const maxX = Math.max(margin, container.clientWidth - popover.offsetWidth - margin);
    const maxY = Math.max(margin, container.clientHeight - popover.offsetHeight - margin);
    const corrected = {
      x: Math.min(0, maxX - position.x),
      y: Math.min(0, maxY - position.y),
    };
    setPositionCorrection((current) =>
      current.x === corrected.x && current.y === corrected.y ? current : corrected
    );
  }, [detail, position]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose('escape');
    }
  };

  return (
    <aside
      ref={popoverRef}
      data-slot="graph-node-health-popover"
      role="dialog"
      aria-label={detail.title}
      tabIndex={-1}
      className={graphNodeHealthPopoverClasses.root}
      style={buildPopoverStyle({
        x: position.x + positionCorrection.x,
        y: position.y + positionCorrection.y,
      })}
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
            {row.detail == null ? null : (
              <dd
                data-slot="graph-node-health-popover-detail"
                className={graphNodeHealthPopoverClasses.detail}
              >
                {row.detail}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </aside>
  );
}
