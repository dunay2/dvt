/** Owned concern: reveal full graph metric evidence from compact card values. */
import type { ReactElement } from 'react';

import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import {
  MetricEvidenceHotspot,
  type MetricEvidenceTone,
} from '../../components/metrics/MetricEvidenceHotspot';
import type { GraphNodeCardStatusTone } from './graphNodeCardStrategyContracts';

export type GraphNodeMetricHotspotProps = Readonly<{
  className?: string;
  detail: string;
  focusable?: boolean;
  tone?: MetricEvidenceTone;
  value: string;
}>;

export function resolveGraphNodeMetricEvidenceTone(
  tone: GraphNodeCardStatusTone | undefined
): MetricEvidenceTone {
  if (tone === 'success') {
    return 'measured';
  }
  if (tone === 'warning') {
    return 'estimated';
  }
  return 'neutral';
}

export function GraphNodeMetricHotspot({
  className,
  detail,
  focusable = true,
  tone = 'neutral',
  value,
}: GraphNodeMetricHotspotProps): ReactElement {
  return (
    <MetricEvidenceHotspot
      className={className}
      dataSlot="graph-node-metric-hotspot"
      detail={detail}
      focusable={focusable}
      tone={tone}
      triggerProps={canvasNodeEmbeddedControlProps}
      value={value}
    />
  );
}
