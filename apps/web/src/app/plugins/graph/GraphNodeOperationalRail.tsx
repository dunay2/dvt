/** Owned concern: render graph-node operational metrics as an optional detail affordance. */
import type { KeyboardEvent, MouseEvent, ReactElement } from 'react';

import type { GraphNodeCardMetric } from './graphNodeCardStrategyContracts';
import { graphVisualClasses } from './graphVisualTokens';

export type GraphNodeOperationalRailProps = Readonly<{
  metrics: readonly GraphNodeCardMetric[];
  onOpen?: (anchorRect: DOMRect) => void;
}>;

function stopAndOpen(
  event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
  onOpen: (anchorRect: DOMRect) => void
): void {
  event.stopPropagation();
  onOpen(event.currentTarget.getBoundingClientRect());
}

function renderMetrics(metrics: readonly GraphNodeCardMetric[]): ReactElement[] {
  return metrics.map((metric) => (
    <span key={metric.id} className={graphVisualClasses.nodeCardOperationalMetric}>
      <span className={graphVisualClasses.nodeCardOperationalLabel}>{metric.label}</span>
      <span className={graphVisualClasses.nodeCardOperationalValue}>{metric.value}</span>
    </span>
  ));
}

export function GraphNodeOperationalRail({
  metrics,
  onOpen,
}: GraphNodeOperationalRailProps): ReactElement | null {
  if (metrics.length === 0) {
    return null;
  }

  if (onOpen == null) {
    return (
      <div
        data-slot="graph-node-operational-rail"
        className={graphVisualClasses.nodeCardOperationalRail}
      >
        {renderMetrics(metrics)}
      </div>
    );
  }

  return (
    <button
      type="button"
      data-slot="graph-node-operational-rail"
      aria-label="Open node operational details"
      className={graphVisualClasses.nodeCardOperationalRailButton}
      onClick={(event) => stopAndOpen(event, onOpen)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          stopAndOpen(event, onOpen);
        }
      }}
    >
      {renderMetrics(metrics)}
    </button>
  );
}
