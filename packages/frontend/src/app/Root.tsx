import { Outlet } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TopAppBar from './components/TopAppBar';
import LeftNavigation from './components/LeftNavigation';
import Console from './components/Console';
import { useAppStore } from './stores/appStore';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './components/ui/resizable';
import '@xyflow/react/dist/style.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function Root() {
  const { leftNavCollapsed, focusMode, consolePanelHeight } = useAppStore();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="h-screen w-screen flex flex-col bg-[#1a1d23] text-white overflow-hidden">
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
              <ResizablePanel defaultSize={consolePanelHeight > 0 ? 70 : 100}>
                <div className="h-full w-full overflow-hidden">
                  <Outlet />
                </div>
              </ResizablePanel>

              {/* Bottom Console Drawer */}
              {!focusMode && consolePanelHeight > 0 && (
                <>
                  <ResizableHandle />
                  <ResizablePanel defaultSize={30} minSize={15} maxSize={50}>
                    <Console />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}
