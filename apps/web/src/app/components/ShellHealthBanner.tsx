import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PlatformConnectionState } from '../../capabilities/platform-health';

import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';

type ShellHealthBannerProps = {
  readonly autoRefreshIntervalMs: number;
  readonly connectionState: PlatformConnectionState | null;
  readonly detailMessage: string | null;
  readonly isFetching: boolean;
  readonly lastSettledAtMs: number;
  readonly onRetry: () => void;
};

function formatRemainingSeconds(remainingMs: number): string {
  const seconds = Math.max(1, Math.ceil(remainingMs / 1_000));
  return `${seconds}s`;
}

export default function ShellHealthBanner({
  autoRefreshIntervalMs,
  connectionState,
  detailMessage,
  isFetching,
  lastSettledAtMs,
  onRetry,
}: ShellHealthBannerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!connectionState || connectionState.rest === 'ok') {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [connectionState]);

  if (!connectionState || connectionState.rest === 'ok') {
    return null;
  }

  const isOffline = connectionState.rest === 'offline';
  const nextRefreshInMs =
    lastSettledAtMs > 0 ? Math.max(lastSettledAtMs + autoRefreshIntervalMs - now, 0) : null;
  const countdownMessage = isFetching
    ? 'Refreshing platform health now.'
    : nextRefreshInMs === null
      ? 'Auto-refresh is waiting for the first completed health check.'
      : nextRefreshInMs === 0
        ? 'Auto-refresh is due now.'
        : `Auto-refresh in ${formatRemainingSeconds(nextRefreshInMs)}.`;

  return (
    <div className="border-b border-slate-800 bg-slate-950/95 px-4 py-3" data-testid="shell-health-banner">
      <Alert
        className={
          isOffline
            ? 'border-red-500/40 bg-red-950/30 text-red-50 [&_[data-slot=alert-description]]:text-red-100/85'
            : 'border-amber-500/40 bg-amber-950/30 text-amber-50 [&_[data-slot=alert-description]]:text-amber-100/85'
        }
        variant={isOffline ? 'destructive' : 'default'}
      >
        {isOffline ? <WifiOff /> : <AlertTriangle />}
        <AlertTitle>{isOffline ? 'Backend offline' : 'Backend degraded'}</AlertTitle>
        <AlertDescription>
          <p>{detailMessage ?? (isOffline ? 'Unable to reach the platform health endpoints.' : 'The platform health snapshot reports degraded service.')}</p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <span className="text-xs font-medium uppercase tracking-wide">{countdownMessage}</span>
            <Button
              className="h-8"
              disabled={isFetching}
              onClick={onRetry}
              size="sm"
              type="button"
              variant={isOffline ? 'destructive' : 'secondary'}
            >
              <RefreshCw className={isFetching ? 'animate-spin' : ''} />
              Retry now
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
