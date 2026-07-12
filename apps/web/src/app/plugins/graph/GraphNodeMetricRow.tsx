/** Owned concern: render graph-node summary metrics from an already-projected card model. */
import type { ReactElement } from 'react';

import type {
  GraphNodeCardMetric,
  GraphNodeCardStatusTone,
} from './graphNodeCardStrategyContracts';
import {
  GraphNodeMetricHotspot,
  resolveGraphNodeMetricEvidenceTone,
} from './GraphNodeMetricHotspot';
import { graphNodeMetricRowClasses } from './graphVisualTokens';

export type GraphNodeMetricRowProps = Readonly<{
  metrics: readonly GraphNodeCardMetric[];
}>;

function resolveMetricValueClassName(tone: GraphNodeCardStatusTone | undefined): string {
  return tone === undefined
    ? graphNodeMetricRowClasses.value
    : `${graphNodeMetricRowClasses.value} ${graphNodeMetricRowClasses.valueTone[tone]}`;
}

export function GraphNodeMetricRow({ metrics }: GraphNodeMetricRowProps): ReactElement | null {
  if (metrics.length === 0) {
    return null;
  }

  return (
    <div data-slot="graph-node-metric-row" className={graphNodeMetricRowClasses.root}>
      {metrics.map((metric) => (
        <span key={metric.id} className={graphNodeMetricRowClasses.item} data-tone={metric.tone}>
          <span className={graphNodeMetricRowClasses.label}>{metric.label}</span>
          <GraphNodeMetricHotspot
            className={resolveMetricValueClassName(metric.tone)}
            detail={metric.detail ?? `${metric.label}: ${metric.value}`}
            tone={resolveGraphNodeMetricEvidenceTone(metric.tone)}
            value={metric.value}
          />
        </span>
      ))}
    </div>
  );
}
