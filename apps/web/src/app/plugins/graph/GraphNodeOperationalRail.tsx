/** Owned concern: render graph-node operational metrics as an optional detail affordance. */
import type { MouseEvent, ReactElement } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  Database,
  DollarSign,
  List,
  RefreshCw,
  Timer,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '../../components/ui/utils';
import type {
  GraphNodeCardMetric,
  GraphNodeCardMetricIcon,
} from './graphNodeCardStrategyContracts';
import { graphNodeOperationalRailClasses } from './graphVisualTokens';

const metricIconByName: Record<GraphNodeCardMetricIcon, LucideIcon> = {
  clock: Clock,
  refresh: RefreshCw,
  throughput: Activity,
  database: Database,
  timer: Timer,
  rows: List,
  cost: DollarSign,
  drift: AlertTriangle,
};

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

function stopAndOpen(event: MouseEvent<HTMLElement>, onOpen: (anchorRect: DOMRect) => void): void {
  event.stopPropagation();
  onOpen(event.currentTarget.getBoundingClientRect());
}

function renderMetrics(metrics: readonly GraphNodeCardMetric[]): ReactElement[] {
  return metrics.map((metric) => {
    const Icon = metric.icon == null ? null : metricIconByName[metric.icon];
    const tone = metric.tone ?? 'neutral';

    return (
      <span
        key={metric.id}
        data-slot="graph-node-operational-metric"
        data-tone={tone}
        className={graphNodeOperationalRailClasses.metric}
      >
        {Icon == null ? null : (
          <span
            data-slot="graph-node-operational-icon"
            data-icon={metric.icon}
            aria-hidden="true"
            className={graphNodeOperationalRailClasses.icon}
          >
            <Icon className={graphNodeOperationalRailClasses.iconSvg} aria-hidden="true" />
          </span>
        )}
        <span className={graphNodeOperationalRailClasses.metricText}>
          <span className={graphNodeOperationalRailClasses.label}>{metric.label}</span>
          <span
            data-slot="graph-node-operational-value"
            className={cn(
              graphNodeOperationalRailClasses.value,
              graphNodeOperationalRailClasses.valueTone[tone]
            )}
          >
            {metric.value}
          </span>
        </span>
      </span>
    );
  });
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
    >
      {renderMetrics(metrics)}
    </button>
  );
}
