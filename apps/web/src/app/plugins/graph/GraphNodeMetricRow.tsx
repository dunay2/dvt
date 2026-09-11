/** Owned concern: render graph-node summary metrics from an already-projected card model. */
import type { ReactElement } from 'react';
import { Clock, Database, Eye, RefreshCw, Table2, Workflow, type LucideIcon } from 'lucide-react';

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
  clock: Clock,
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
        const iconName = metric.icon ?? (metric.id === 'materialization' ? 'database' : undefined);
        const Icon = iconName == null ? null : summaryMetricIconByName[iconName];
        const detail = metric.detail ?? `${metric.label}: ${metric.value}`;
        const iconElement =
          Icon == null ? null : (
            <span
              data-slot="graph-node-summary-icon"
              data-icon={iconName}
              className={graphNodeMetricRowClasses.icon}
              aria-hidden="true"
            >
              <Icon className={graphNodeMetricRowClasses.iconSvg} aria-hidden="true" />
            </span>
          );

        if (placement === 'header') {
          return (
            <span
              key={metric.id}
              className={graphNodeMetricRowClasses.item.header}
              data-tone={metric.tone}
            >
              <GraphNodeMetricHotspot
                className={graphNodeMetricRowClasses.headerTrigger}
                detail={detail}
                tone={resolveGraphNodeMetricEvidenceTone(metric.tone)}
                value={
                  <>
                    {iconElement}
                    <span
                      data-slot="graph-node-summary-label"
                      className={graphNodeMetricRowClasses.label.header}
                    >
                      {metric.label}
                    </span>
                    <span className={resolveMetricValueClassName(metric.tone)}>{metric.value}</span>
                  </>
                }
              />
            </span>
          );
        }

        return (
          <span
            key={metric.id}
            className={graphNodeMetricRowClasses.item.body}
            data-tone={metric.tone}
          >
            {iconElement}
            <span className={graphNodeMetricRowClasses.label.body}>{metric.label}</span>
            <GraphNodeMetricHotspot
              className={resolveMetricValueClassName(metric.tone)}
              detail={detail}
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
