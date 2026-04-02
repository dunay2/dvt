import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Outlet } from 'react-router';
import {
  PLATFORM_HEALTH_REFETCH_INTERVAL_MS,
  selectPlatformConnectionState,
  type PlatformConnectionState,
  type PlatformHealthSnapshot,
  type PlatformHealthCapabilityApi,
  usePlatformHealthSnapshotQuery,
} from '../capabilities/platform-health';

import Console from './components/Console';
import LeftNavigation from './components/LeftNavigation';
import ShellHealthBanner from './components/ShellHealthBanner';
import TopAppBar from './components/TopAppBar';
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

function getPlatformHealthErrorMessage(
  platformHealth: ReturnType<typeof usePlatformHealthSnapshotQuery>
): string | null {
  if (!platformHealth.isError) {
    return null;
  }

  return platformHealth.error instanceof Error
    ? platformHealth.error.message
    : 'Unknown platform health query error';
}

function getPlatformHealthDetailMessage(
  snapshot: PlatformHealthSnapshot | undefined,
  errorMessage: string | null
): string | null {
  if (errorMessage) {
    return errorMessage;
  }

  if (!snapshot) {
    return null;
  }

  if (snapshot.healthz.data.status === 'degraded') {
    const intentReconciler = snapshot.healthz.data.components.intentReconciler;
    return intentReconciler.status === 'degraded'
      ? `Intent reconciler degraded: ${intentReconciler.reasonCode}.`
      : 'The /healthz endpoint reports degraded platform status.';
  }

  if (snapshot.readyz.availability === 'available' && snapshot.readyz.data?.ok === false) {
    return `Readiness not satisfied: ${snapshot.readyz.data.reasonCode}.`;
  }

  if (snapshot.dbReady.availability === 'available' && snapshot.dbReady.data?.ok === false) {
    return `Database readiness failed: ${snapshot.dbReady.data.reason ?? 'unknown reason'}.`;
  }

  const failedOptionalProbe = [snapshot.readyz, snapshot.version, snapshot.dbReady].find(
    (probe) => probe.error !== null
  );

  if (failedOptionalProbe?.error) {
    return `${failedOptionalProbe.endpoint} probe failed: ${failedOptionalProbe.error.message}`;
  }

  return null;
}

type RootShellProps = {
  readonly platformHealthCapability?: PlatformHealthCapabilityApi;
};

export function RootShell({ platformHealthCapability }: RootShellProps = {}) {
  const { focusMode, consolePanelHeight, consolePanelVisible, setConnectionStatus } = useAppStore();
  const platformHealth = usePlatformHealthSnapshotQuery(platformHealthCapability);

  useEffect(() => {
    if (platformHealth.isPending && !platformHealth.data && !platformHealth.isError) {
      return;
    }

    setConnectionStatus(selectPlatformConnectionState(platformHealth.data, platformHealth.isError));
  }, [platformHealth.data, platformHealth.isError, platformHealth.isPending, setConnectionStatus]);

  const errorMessage = getPlatformHealthErrorMessage(platformHealth);
  const connectionDetail = getPlatformHealthDetailMessage(platformHealth.data, errorMessage);
  const isInitialHealthCheckPending =
    platformHealth.isPending && !platformHealth.data && !platformHealth.isError;
  const connectionStateOverride: PlatformConnectionState | null = isInitialHealthCheckPending
    ? null
    : selectPlatformConnectionState(platformHealth.data, platformHealth.isError);
  const lastSettledAtMs = Math.max(
    platformHealth.dataUpdatedAt ?? 0,
    platformHealth.errorUpdatedAt ?? 0
  );

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      <TopAppBar
        connectionDetail={connectionDetail}
        connectionStateOverride={connectionStateOverride}
        isConnectionChecking={isInitialHealthCheckPending}
      />
      <ShellHealthBanner
        autoRefreshIntervalMs={PLATFORM_HEALTH_REFETCH_INTERVAL_MS}
        connectionState={connectionStateOverride}
        detailMessage={connectionDetail}
        isFetching={platformHealth.isFetching}
        lastSettledAtMs={lastSettledAtMs}
        onRetry={() => {
          void platformHealth.refetch();
        }}
      />

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
