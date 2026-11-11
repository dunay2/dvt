/**
 * Owned concern: present platform connection health as one accessible color pilot.
 * The existing health projection owns state; the tooltip retains its diagnostic detail.
 */
import type { PlatformConnectionState } from '../../../capabilities/platform-health';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { topAppBarClasses } from './chrome';
import type { ShellTopBarCopy } from './copy';

type ShellConnectionStatusProps = {
  readonly isConnectionChecking: boolean;
  readonly effectiveConnectionStatus: PlatformConnectionState;
  readonly connectionDetail?: string | null;
  readonly copy: ShellTopBarCopy;
};

export function ShellConnectionStatus({
  isConnectionChecking,
  effectiveConnectionStatus,
  connectionDetail,
  copy,
}: ShellConnectionStatusProps) {
  const state = isConnectionChecking ? 'checking' : effectiveConnectionStatus.rest;
  const labels: Record<typeof state, string> = {
    checking: copy.checking,
    ok: `${copy.restApiLabel}: ${effectiveConnectionStatus.rest}; ${copy.liveEventsLabel}: ${effectiveConnectionStatus.liveEvents}`,
    offline: copy.offline,
    degraded: copy.degraded,
  };
  const detail = isConnectionChecking
    ? copy.checkingTooltip
    : (connectionDetail ??
      (state === 'offline' ? copy.offlineTooltipFallback : copy.degradedTooltipFallback));

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          data-slot="shell-connection-status"
          data-connection-state={state}
          className={topAppBarClasses.smallStatusText}
          role="img"
          aria-label={labels[state]}
          tabIndex={0}
        />
      </TooltipTrigger>
      <TooltipContent>
        {state === 'ok' ? (
          <>
            <p>
              {copy.restApiLabel}: {effectiveConnectionStatus.rest}
            </p>
            <p>
              {copy.liveEventsLabel}: {effectiveConnectionStatus.liveEvents}
            </p>
          </>
        ) : (
          <p>{detail}</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
