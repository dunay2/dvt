/** Owned concern: render graph-node operational metrics as an optional detail affordance. */
import { useId, type KeyboardEvent, type MouseEvent, type ReactElement } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  Database,
  DollarSign,
  Eye,
  List,
  RefreshCw,
  Table2,
  Timer,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import { cn } from '../../components/ui/utils';
import type {
  GraphNodeCardMetric,
  GraphNodeCardMetricIcon,
} from './graphNodeCardStrategyContracts';
import {
  GraphNodeMetricHotspot,
  resolveGraphNodeMetricEvidenceTone,
} from './GraphNodeMetricHotspot';
import { graphNodeOperationalRailClasses } from './graphVisualTokens';

const metricIconByName: Record<GraphNodeCardMetricIcon, LucideIcon> = {
  clock: Clock,
  refresh: RefreshCw,
  throughput: Activity,
  database: Database,
  columns: Table2,
  timer: Timer,
  rows: List,
  cost: DollarSign,
  drift: AlertTriangle,
  eye: Eye,
  table: Table2,
  workflow: Workflow,
};

type GraphNodeOperationalRailBaseProps = Readonly<{
  metrics: readonly GraphNodeCardMetric[];
  dataSampleInteractionLabel?: string;
}>;

type GraphNodeOperationalRailStaticProps = GraphNodeOperationalRailBaseProps &
  Readonly<{
    ariaLabel?: never;
    onOpen?: undefined;
    onOpenDataSample?: undefined;
  }>;

type GraphNodeOperationalRailInteractiveProps = GraphNodeOperationalRailBaseProps &
  Readonly<{
    ariaLabel: string;
    onOpen?: (anchorElement: HTMLElement) => void;
    onOpenDataSample?: () => void;
  }>;

export type GraphNodeOperationalRailProps =
  GraphNodeOperationalRailStaticProps | GraphNodeOperationalRailInteractiveProps;

function stopAndOpen(
  event: MouseEvent<HTMLElement>,
  onOpen: (anchorElement: HTMLElement) => void
): void {
  event.stopPropagation();
  onOpen(event.currentTarget);
}

function openDataSample(
  event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
  onOpenDataSample: () => void
): void {
  event.preventDefault();
  event.stopPropagation();
  onOpenDataSample();
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
          <GraphNodeMetricHotspot
            className={cn(
              graphNodeOperationalRailClasses.value,
              graphNodeOperationalRailClasses.valueTone[tone]
            )}
            detail={metric.detail ?? `${metric.label}: ${metric.value}`}
            focusable={false}
            tone={resolveGraphNodeMetricEvidenceTone(metric.tone)}
            value={metric.value}
          />
        </span>
      </span>
    );
  });
}

export function GraphNodeOperationalRail({
  metrics,
  ariaLabel,
  dataSampleInteractionLabel,
  onOpen,
  onOpenDataSample,
}: GraphNodeOperationalRailProps): ReactElement | null {
  const descriptionId = useId();
  if (metrics.length === 0) {
    return null;
  }

  if (onOpen == null && onOpenDataSample == null) {
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
      {...canvasNodeEmbeddedControlProps}
      aria-label={ariaLabel}
      aria-describedby={descriptionId}
      className={graphNodeOperationalRailClasses.button}
      onClick={onOpen == null ? undefined : (event) => stopAndOpen(event, onOpen)}
      onDoubleClick={
        onOpenDataSample == null ? undefined : (event) => openDataSample(event, onOpenDataSample)
      }
      onKeyDown={
        onOpenDataSample == null
          ? undefined
          : (event) => {
              if (event.key === 'Enter') {
                openDataSample(event, onOpenDataSample);
              }
            }
      }
    >
      {renderMetrics(metrics)}
      <span id={descriptionId} className={graphNodeOperationalRailClasses.accessibleDescription}>
        {metrics.map((metric) => metric.detail ?? `${metric.label}: ${metric.value}`).join(' ')}
        {dataSampleInteractionLabel == null ? null : ` ${dataSampleInteractionLabel}`}
      </span>
    </button>
  );
}
