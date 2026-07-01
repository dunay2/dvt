/** Owned concern: render graph-node operational metrics as an optional detail affordance. */
import type { KeyboardEvent, MouseEvent, ReactElement } from 'react';

import type { GraphNodeCardMetric } from './graphNodeCardStrategyContracts';
import { graphNodeOperationalRailClasses } from './graphVisualTokens';

type GraphNodeOperationalRailBaseProps = Readonly<{
  metrics: readonly GraphNodeCardMetric[];
}>;

type GraphNodeOperationalRailStaticProps = GraphNodeOperationalRailBaseProps &
  Readonly<{
    ariaLabel?: never;
    onOpen?: undefined;
  }>;

type GraphNodeOperationalRailInteractiveProps = GraphNodeOperationalRailBaseProps &
  Readonly<{
    ariaLabel: string;
    onOpen: (anchorRect: DOMRect) => void;
  }>;

export type GraphNodeOperationalRailProps =
  | GraphNodeOperationalRailStaticProps
  | GraphNodeOperationalRailInteractiveProps;

function stopAndOpen(
  event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
  onOpen: (anchorRect: DOMRect) => void
): void {
  event.stopPropagation();
  onOpen(event.currentTarget.getBoundingClientRect());
}

function renderMetrics(metrics: readonly GraphNodeCardMetric[]): ReactElement[] {
  return metrics.map((metric) => (
    <span key={metric.id} className={graphNodeOperationalRailClasses.metric}>
      <span className={graphNodeOperationalRailClasses.label}>{metric.label}</span>
      <span className={graphNodeOperationalRailClasses.value}>{metric.value}</span>
    </span>
  ));
}

export function GraphNodeOperationalRail({
  metrics,
  ariaLabel,
  onOpen,
}: GraphNodeOperationalRailProps): ReactElement | null {
  if (metrics.length === 0) {
    return null;
  }

  if (onOpen == null) {
    return (
      <div data-slot="graph-node-operational-rail" className={graphNodeOperationalRailClasses.root}>
        {renderMetrics(metrics)}
      </div>
    );
  }

  return (
    <button
      type="button"
      data-slot="graph-node-operational-rail"
      aria-label={ariaLabel}
      className={graphNodeOperationalRailClasses.button}
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
