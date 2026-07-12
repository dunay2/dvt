/** Owned concern: reveal complete metric evidence from a compact UI value. */
import type { HTMLAttributes, ReactElement } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../ui/utils';
import { metricEvidenceHotspotClasses } from './metricEvidenceTokens';

type MetricEvidenceTriggerProps = HTMLAttributes<HTMLSpanElement> & {
  readonly [attribute: `data-${string}`]: string | number | undefined;
};

export type MetricEvidenceTone = 'neutral' | 'measured' | 'estimated';

export type MetricEvidenceHotspotProps = Readonly<{
  className?: string;
  contentClassName?: string;
  dataSlot?: string;
  detail: string;
  focusable?: boolean;
  tone?: MetricEvidenceTone;
  triggerProps?: MetricEvidenceTriggerProps;
  value: string;
}>;

export function MetricEvidenceHotspot({
  className,
  contentClassName,
  dataSlot = 'metric-evidence-hotspot',
  detail,
  focusable = true,
  tone = 'neutral',
  triggerProps,
  value,
}: MetricEvidenceHotspotProps): ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          {...triggerProps}
          data-slot={dataSlot}
          data-tone={tone}
          aria-label={detail}
          className={cn(
            metricEvidenceHotspotClasses.trigger,
            metricEvidenceHotspotClasses.tone[tone],
            className
          )}
          tabIndex={focusable ? 0 : undefined}
        >
          {value}
        </span>
      </TooltipTrigger>
      <TooltipContent
        data-slot={`${dataSlot}-detail`}
        side="top"
        sideOffset={6}
        className={cn(metricEvidenceHotspotClasses.content, contentClassName)}
      >
        {detail}
      </TooltipContent>
    </Tooltip>
  );
}
