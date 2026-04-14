import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PlatformConnectionState } from '../../capabilities/platform-health';

import { Button } from './ui/button';
import { cn } from './ui/utils';

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
  let countdownMessage = 'Auto-refresh is waiting for the first completed health check.';
  if (isFetching) {
    countdownMessage = 'Refreshing platform health now.';
  } else if (nextRefreshInMs === 0) {
    countdownMessage = 'Auto-refresh is due now.';
  } else if (nextRefreshInMs !== null) {
    countdownMessage = `Auto-refresh in ${formatRemainingSeconds(nextRefreshInMs)}.`;
  }
  const headline = isOffline ? 'Backend offline' : 'Backend degraded';
  const detail =
    detailMessage ??
    (isOffline
      ? 'Unable to reach the platform health endpoints.'
      : 'The platform health snapshot reports degraded service.');

  return (
    <div
      className="border-b border-[color:var(--border-default)] bg-[var(--surface-shell)] px-3 py-1.5"
      data-testid="shell-health-banner"
    >
      <div
        className={cn(
          'flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-1.5 text-xs',
          isOffline
            ? 'border-red-500/40 bg-red-950/25 text-red-100'
            : 'border-amber-500/40 bg-amber-950/25 text-amber-100'
        )}
      >
        {isOffline ? (
          <WifiOff className="size-4 shrink-0" />
        ) : (
          <AlertTriangle className="size-4 shrink-0" />
        )}
        <span className="font-semibold text-[var(--text-strong)]">{headline}</span>
        <span className="min-w-0 flex-1 truncate text-[11px] leading-5 opacity-80" title={detail}>
          {detail}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide opacity-80">
          {countdownMessage}
        </span>
        <Button
          className="h-7 px-2.5 text-[11px]"
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
    </div>
  );
}
