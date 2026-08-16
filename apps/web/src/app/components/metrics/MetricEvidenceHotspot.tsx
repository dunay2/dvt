/** Owned concern: reveal complete metric evidence from a compact UI value. */
import type { MouseEventHandler, ReactElement } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../ui/utils';
import { metricEvidenceHotspotClasses } from './metricEvidenceTokens';

type MetricEvidenceTriggerProps = {
  readonly [attribute: `data-${string}`]: string | number | undefined;
};

export type MetricEvidenceTone = 'neutral' | 'measured' | 'estimated';

export type MetricEvidenceHotspotProps = Readonly<{
  className?: string;
  contentClassName?: string;
  dataSlot?: string;
  detail: string;
  focusable?: boolean;
  onActivate?: MouseEventHandler<HTMLButtonElement>;
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
  onActivate,
  tone = 'neutral',
  triggerProps,
  value,
}: MetricEvidenceHotspotProps): ReactElement {
  const triggerClassName = cn(
    metricEvidenceHotspotClasses.trigger,
    metricEvidenceHotspotClasses.tone[tone],
    onActivate != null && metricEvidenceHotspotClasses.interactive,
    className
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {onActivate == null ? (
          <span
            {...triggerProps}
            data-slot={dataSlot}
            data-tone={tone}
            aria-label={detail}
            className={triggerClassName}
            tabIndex={focusable ? 0 : undefined}
          >
            {value}
          </span>
        ) : (
          <button
            {...triggerProps}
            type="button"
            data-slot={dataSlot}
            data-tone={tone}
            aria-label={detail}
            className={triggerClassName}
            tabIndex={focusable ? undefined : -1}
            onClick={onActivate}
          >
            {value}
          </button>
        )}
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
