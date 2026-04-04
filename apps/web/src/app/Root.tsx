import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Outlet } from 'react-router';
import {
  PLATFORM_HEALTH_REFETCH_INTERVAL_MS,
  getPlatformConnectionDetail,
  getPlatformHealthErrorMessageFromQuery,
  selectPlatformConnectionState,
  type PlatformConnectionState,
  type PlatformHealthCapabilityApi,
  usePlatformHealthSnapshotQuery,
} from '../capabilities/platform-health';

import Console from './components/Console';
import LeftNavigation from './components/LeftNavigation';
import ShellHealthBanner from './components/ShellHealthBanner';
import TopAppBar from './components/TopAppBar';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './components/ui/resizable';
import { AppServicesProvider } from './services/AppServicesContext';
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
  return getPlatformHealthErrorMessageFromQuery(platformHealth.isError, platformHealth.error);
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
  const isInitialHealthCheckPending =
    platformHealth.isPending && !platformHealth.data && !platformHealth.isError;
  const connectionStateOverride: PlatformConnectionState | null = isInitialHealthCheckPending
    ? null
    : selectPlatformConnectionState(platformHealth.data, platformHealth.isError);
  const connectionDetail = connectionStateOverride
    ? getPlatformConnectionDetail(connectionStateOverride.rest, platformHealth.data, errorMessage)
    : null;
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
      <AppServicesProvider>
        <RootShell />
      </AppServicesProvider>
    </QueryClientProvider>
  );
}
