import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router';
import { AlertTriangle, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import {
  selectPlatformConnectionState,
  usePlatformHealthSnapshotQuery,
} from '../capabilities/platform-health';
import {
  getNextRetryDelayMs,
  getPlatformConnectionDetail,
  getPlatformHealthErrorMessageFromQuery,
} from './platformHealthStatus';

import Console from './components/Console';
import LeftNavigation from './components/LeftNavigation';
import TopAppBar from './components/TopAppBar';
import { Button } from './components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './components/ui/resizable';
import { useAppStore } from './stores/appStore';
import '@xyflow/react/dist/style.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function HealthStatusBanner({
  restStatus,
  detail,
  isFetching,
  nextRetryInSeconds,
  onRetryNow,
}: {
  readonly restStatus: 'ok' | 'degraded' | 'offline';
  readonly detail: string;
  readonly isFetching: boolean;
  readonly nextRetryInSeconds: number;
  readonly onRetryNow: () => void;
}) {
  if (restStatus === 'ok') {
    return null;
  }

  const isOffline = restStatus === 'offline';
  const Icon = isOffline ? WifiOff : AlertTriangle;
  const title = isOffline ? 'Backend offline' : 'Backend degraded';
  const toneClasses = isOffline
    ? 'border-red-600/60 bg-red-950/60 text-red-100'
    : 'border-amber-600/60 bg-amber-950/60 text-amber-100';

  return (
    <div className={`border-b px-4 py-2 ${toneClasses}`}>
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3">
        <Icon className="size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="truncate text-xs opacity-90">{detail}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-80">
            Retry in {nextRetryInSeconds}s
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 border-current bg-transparent px-2.5 text-xs text-inherit hover:bg-white/10"
            onClick={onRetryNow}
            disabled={isFetching}
          >
            {isFetching ? (
              <>
                <Loader2 className="mr-1.5 size-3 animate-spin" />
                Retrying
              </>
            ) : (
              <>
                <RefreshCw className="mr-1.5 size-3" />
                Retry now
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RootShell() {
  const { focusMode, consolePanelHeight, consolePanelVisible, setConnectionStatus } = useAppStore();
  const platformHealth = usePlatformHealthSnapshotQuery();
  const [retryDelayMs, setRetryDelayMs] = useState(5_000);
  const [nextRetryAt, setNextRetryAt] = useState<number | null>(null);
  const [nextRetryInSeconds, setNextRetryInSeconds] = useState(5);

  useEffect(() => {
    if (platformHealth.isPending && !platformHealth.data && !platformHealth.isError) {
      return;
    }

    setConnectionStatus(selectPlatformConnectionState(platformHealth.data, platformHealth.isError));
  }, [platformHealth.data, platformHealth.isError, platformHealth.isPending, setConnectionStatus]);

  const connectionStatus = selectPlatformConnectionState(platformHealth.data, platformHealth.isError);
  const errorMessage = getPlatformHealthErrorMessageFromQuery(
    platformHealth.isError,
    platformHealth.error
  );
  const connectionDetail = getPlatformConnectionDetail(
    connectionStatus.rest,
    platformHealth.data,
    errorMessage
  );

  useEffect(() => {
    if (connectionStatus.rest === 'ok') {
      setRetryDelayMs(5_000);
      setNextRetryAt(null);
      setNextRetryInSeconds(5);
      return;
    }

    if (platformHealth.isFetching || nextRetryAt !== null) {
      return;
    }

    const targetTime = Date.now() + retryDelayMs;
    setNextRetryAt(targetTime);
    setNextRetryInSeconds(Math.ceil(retryDelayMs / 1_000));

    const timer = window.setTimeout(() => {
      setNextRetryAt(null);
      setRetryDelayMs((previousDelay) => getNextRetryDelayMs(previousDelay));
      void platformHealth.refetch();
    }, retryDelayMs);

    return () => window.clearTimeout(timer);
  }, [connectionStatus.rest, nextRetryAt, platformHealth.isFetching, platformHealth.refetch, retryDelayMs]);

  useEffect(() => {
    if (nextRetryAt === null || connectionStatus.rest === 'ok') {
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((nextRetryAt - Date.now()) / 1_000));
      setNextRetryInSeconds(remaining);
    };

    updateRemaining();
    const interval = window.setInterval(updateRemaining, 500);
    return () => window.clearInterval(interval);
  }, [connectionStatus.rest, nextRetryAt]);

  const handleRetryNow = () => {
    setNextRetryAt(null);
    setRetryDelayMs(5_000);
    void platformHealth.refetch();
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      <TopAppBar connectionDetail={connectionDetail} />
      {connectionStatus.rest !== 'ok' && connectionDetail ? (
        <HealthStatusBanner
          restStatus={connectionStatus.rest}
          detail={connectionDetail}
          isFetching={platformHealth.isFetching}
          nextRetryInSeconds={nextRetryInSeconds}
          onRetryNow={handleRetryNow}
        />
      ) : null}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation */}
        {!focusMode && <LeftNavigation />}

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ResizablePanelGroup direction="vertical">
            {/* Main Content Area */}
            <ResizablePanel defaultSize={consolePanelVisible && consolePanelHeight > 0 ? 78 : 100}>
              <div className="h-full w-full overflow-hidden">
                <Outlet />
              </div>
            </ResizablePanel>

            {/* Bottom Console Drawer */}
            {!focusMode && consolePanelVisible && consolePanelHeight > 0 && (
              <>
                <ResizableHandle />
                <ResizablePanel defaultSize={22} minSize={12} maxSize={40}>
                  <Console />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
}

export default function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootShell />
    </QueryClientProvider>
  );
}
