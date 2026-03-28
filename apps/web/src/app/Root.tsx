import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Outlet } from 'react-router';

import Console from './components/Console';
import GlobalStatusBanner from './components/GlobalStatusBanner';
import LeftNavigation from './components/LeftNavigation';
import TopAppBar from './components/TopAppBar';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './components/ui/resizable';
import { deriveConnectionStatus, usePlatformHealthQuery } from './queries/usePlatformHealthQuery';
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

function RootShell() {
  const { focusMode, consolePanelHeight, consolePanelVisible, connectionStatus, setConnectionStatus } =
    useAppStore();
  const platformHealth = usePlatformHealthQuery();

  useEffect(() => {
    if (platformHealth.isPending && !platformHealth.data && !platformHealth.isError) {
      return;
    }

    setConnectionStatus(deriveConnectionStatus(platformHealth.data, platformHealth.isError));
  }, [
    platformHealth.data,
    platformHealth.isError,
    platformHealth.isPending,
    setConnectionStatus,
  ]);

  const errorMessage = platformHealth.isError
    ? platformHealth.error instanceof Error
      ? platformHealth.error.message
      : 'Unknown platform health query error'
    : null;

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Global status banner pinned at the top when not healthy */}
      <GlobalStatusBanner
        restStatus={connectionStatus.rest}
        snapshot={platformHealth.data}
        errorMessage={errorMessage}
      />
      {/* Top App Bar */}
      <TopAppBar />

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

