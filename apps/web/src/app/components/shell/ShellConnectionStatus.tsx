import { Activity, AlertTriangle, LoaderCircle, WifiOff } from 'lucide-react';
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
  if (isConnectionChecking) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            data-slot="shell-connection-status"
            className={`${topAppBarClasses.smallStatusText} select-none text-[var(--text-subtle)]`}
          >
            <LoaderCircle className="size-3.5 animate-spin" />
            <span>{copy.checking}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copy.checkingTooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (effectiveConnectionStatus.rest === 'ok') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            data-slot="shell-connection-status"
            className={`${topAppBarClasses.smallStatusText} text-[var(--text-default)]`}
          >
            <div className="size-1.5 rounded-full bg-[var(--status-success)]" />
            <Activity className="size-3.5" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>REST API: {effectiveConnectionStatus.rest}</p>
          <p>Live Events: {effectiveConnectionStatus.liveEvents}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (effectiveConnectionStatus.rest === 'offline') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            data-slot="shell-connection-status"
            className={`${topAppBarClasses.smallStatusText} select-none text-[var(--status-offline)]`}
          >
            <WifiOff className="size-3.5" />
            <span>{copy.offline}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{connectionDetail ?? copy.offlineTooltipFallback}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          data-slot="shell-connection-status"
          className={`${topAppBarClasses.smallStatusText} select-none text-[var(--status-degraded)]`}
        >
          <AlertTriangle className="size-3.5" />
          <span>{copy.degraded}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{connectionDetail ?? copy.degradedTooltipFallback}</p>
      </TooltipContent>
    </Tooltip>
  );
}
