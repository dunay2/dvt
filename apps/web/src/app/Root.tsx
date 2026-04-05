import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Outlet } from 'react-router';
import {
  buildShellHealthPresentationModel,
  type PlatformHealthCapabilityApi,
  usePlatformHealthSnapshotQuery,
} from '../capabilities/platform-health';

import Console from './components/Console';
import LeftNavigation from './components/LeftNavigation';
import ShellHealthBanner from './components/ShellHealthBanner';
import TopAppBar from './components/TopAppBar';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './components/ui/resizable';
import { useUiLayoutStore } from './stores/uiLayoutStore';
import '@xyflow/react/dist/style.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

type RootShellProps = {
  readonly platformHealthCapability?: PlatformHealthCapabilityApi;
};

export function RootShell({ platformHealthCapability }: RootShellProps = {}) {
  const focusMode = useUiLayoutStore((state) => state.focusMode);
  const consolePanelHeight = useUiLayoutStore((state) => state.consolePanelHeight);
  const consolePanelVisible = useUiLayoutStore((state) => state.consolePanelVisible);
  const connectionStatus = useUiLayoutStore((state) => state.connectionStatus);
  const setConnectionStatus = useUiLayoutStore((state) => state.setConnectionStatus);
  const platformHealth = usePlatformHealthSnapshotQuery(platformHealthCapability);
  const shellHealth = buildShellHealthPresentationModel({
    data: platformHealth.data,
    isError: platformHealth.isError,
    error: platformHealth.error,
    isPending: platformHealth.isPending,
    isFetching: platformHealth.isFetching,
    failureCount: platformHealth.failureCount,
    dataUpdatedAt: platformHealth.dataUpdatedAt,
    errorUpdatedAt: platformHealth.errorUpdatedAt,
  });

  useEffect(() => {
    if (shellHealth.connectionState === null) {
      return;
    }

    if (
      connectionStatus.rest === shellHealth.connectionState.rest &&
      connectionStatus.liveEvents === shellHealth.connectionState.liveEvents
    ) {
      return;
    }

    setConnectionStatus(shellHealth.connectionState);
  }, [connectionStatus, setConnectionStatus, shellHealth.connectionState]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      <TopAppBar
        connectionDetail={shellHealth.connectionDetail}
        connectionStateOverride={shellHealth.connectionState}
        isConnectionChecking={shellHealth.isInitialHealthCheckPending}
      />
      <ShellHealthBanner
        autoRefreshIntervalMs={shellHealth.pollingIntervalMs}
        connectionState={shellHealth.connectionState}
        detailMessage={shellHealth.connectionDetail}
        isFetching={shellHealth.isFetching}
        lastSettledAtMs={shellHealth.lastSettledAtMs}
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
