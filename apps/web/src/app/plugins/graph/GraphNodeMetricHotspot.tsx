/** Owned concern: reveal full graph metric evidence from compact card values. */
import type { MouseEvent, ReactElement } from 'react';

import { canvasNodeEmbeddedControlProps } from '../../components/canvas/canvasNodeInteractionBoundary';
import {
  MetricEvidenceHotspot,
  type MetricEvidenceTone,
} from '../../components/metrics/MetricEvidenceHotspot';
import type { GraphNodeCardStatusTone } from './graphNodeCardStrategyContracts';
import { graphNodeMetricHotspotClasses } from './graphVisualTokens';

export type GraphNodeMetricHotspotProps = Readonly<{
  className?: string;
  detail: string;
  focusable?: boolean;
  onActivate?: () => void;
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
  onActivate,
  tone = 'neutral',
  value,
}: GraphNodeMetricHotspotProps): ReactElement {
  return (
    <MetricEvidenceHotspot
      dataSlot="graph-node-metric-hotspot"
      detail={detail}
      focusable={focusable}
      onActivate={
        onActivate == null
          ? undefined
          : (event: MouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              event.stopPropagation();
              onActivate();
            }
      }
      tone={tone}
      triggerProps={canvasNodeEmbeddedControlProps}
      value={value}
      className={
        onActivate == null
          ? className
          : `${className ?? ''} ${graphNodeMetricHotspotClasses.interactive}`.trim()
      }
    />
  );
}
