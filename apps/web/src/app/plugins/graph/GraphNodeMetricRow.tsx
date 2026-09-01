/** Owned concern: render graph-node summary metrics from an already-projected card model. */
import type { ReactElement } from 'react';
import { Database, Eye, RefreshCw, Table2, Workflow, type LucideIcon } from 'lucide-react';

import type {
  GraphNodeCardMetric,
  GraphNodeCardMetricIcon,
  GraphNodeCardStatusTone,
} from './graphNodeCardStrategyContracts';
import {
  GraphNodeMetricHotspot,
  resolveGraphNodeMetricEvidenceTone,
} from './GraphNodeMetricHotspot';
import { graphNodeMetricRowClasses } from './graphVisualTokens';

const summaryMetricIconByName: Partial<Record<GraphNodeCardMetricIcon, LucideIcon>> = {
  database: Database,
  eye: Eye,
  refresh: RefreshCw,
  table: Table2,
  workflow: Workflow,
};

export type GraphNodeMetricRowProps = Readonly<{
  metrics: readonly GraphNodeCardMetric[];
  onOpenCode?: () => void;
  placement?: 'body' | 'header';
}>;

function resolveMetricValueClassName(tone: GraphNodeCardStatusTone | undefined): string {
  return tone === undefined
    ? graphNodeMetricRowClasses.value
    : `${graphNodeMetricRowClasses.value} ${graphNodeMetricRowClasses.valueTone[tone]}`;
}

export function GraphNodeMetricRow({
  metrics,
  onOpenCode,
  placement = 'body',
}: GraphNodeMetricRowProps): ReactElement | null {
  if (metrics.length === 0) {
    return null;
  }

  return (
    <div
      data-slot="graph-node-metric-row"
      data-placement={placement}
      className={graphNodeMetricRowClasses.root[placement]}
    >
      {metrics.map((metric) => {
        const Icon = metric.icon == null ? null : summaryMetricIconByName[metric.icon];

        return (
          <span key={metric.id} className={graphNodeMetricRowClasses.item} data-tone={metric.tone}>
            {Icon == null ? null : (
              <span
                data-slot="graph-node-summary-icon"
                data-icon={metric.icon}
                className={graphNodeMetricRowClasses.icon}
                aria-hidden="true"
              >
                <Icon className={graphNodeMetricRowClasses.iconSvg} aria-hidden="true" />
              </span>
            )}
            <span className={graphNodeMetricRowClasses.label}>{metric.label}</span>
            <GraphNodeMetricHotspot
              className={resolveMetricValueClassName(metric.tone)}
              detail={metric.detail ?? `${metric.label}: ${metric.value}`}
              onActivate={metric.id === 'code' ? onOpenCode : undefined}
              tone={resolveGraphNodeMetricEvidenceTone(metric.tone)}
              value={metric.value}
            />
          </span>
        );
      })}
    </div>
  );
}
