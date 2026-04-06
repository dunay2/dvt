import { Activity, AlertTriangle, LoaderCircle, WifiOff } from 'lucide-react';
import type { PlatformConnectionState } from '../../../capabilities/platform-health';
import type { TopAppBarCopy } from './copy';
import { topAppBarClasses } from './styles';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

type TopAppBarConnectionStatusProps = {
  readonly isConnectionChecking: boolean;
  readonly effectiveConnectionStatus: PlatformConnectionState;
  readonly connectionDetail?: string | null;
  readonly copy: TopAppBarCopy;
};

export function TopAppBarConnectionStatus({
  isConnectionChecking,
  effectiveConnectionStatus,
  connectionDetail,
  copy,
}: TopAppBarConnectionStatusProps) {
  if (isConnectionChecking) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`${topAppBarClasses.smallStatusText} select-none text-slate-400`}>
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
          <div className={`${topAppBarClasses.smallStatusText} text-slate-300`}>
            <div className="size-1.5 rounded-full bg-green-500" />
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
          <div className={`${topAppBarClasses.smallStatusText} select-none text-slate-300`}>
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
        <div className={`${topAppBarClasses.smallStatusText} select-none text-amber-500`}>
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
