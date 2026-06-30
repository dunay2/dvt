/** Owned concern: render graph-node summary metrics from an already-projected card model. */
import type { ReactElement } from 'react';

import type { GraphNodeCardMetric } from './graphNodeCardStrategyContracts';
import { graphVisualClasses } from './graphVisualTokens';

export type GraphNodeMetricRowProps = Readonly<{
  metrics: readonly GraphNodeCardMetric[];
}>;

export function GraphNodeMetricRow({ metrics }: GraphNodeMetricRowProps): ReactElement | null {
  if (metrics.length === 0) {
    return null;
  }

  return (
    <div data-slot="graph-node-metric-row" className={graphVisualClasses.nodeCardMetricRow}>
      {metrics.map((metric) => (
        <span key={metric.id} className={graphVisualClasses.nodeCardMetricItem}>
          <span className={graphVisualClasses.nodeCardMetricLabel}>{metric.label}</span>
          <span title={metric.label} className={graphVisualClasses.nodeCardMetricValue}>
            {metric.value}
          </span>
        </span>
      ))}
    </div>
  );
}
