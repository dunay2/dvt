import type { ReactNode } from 'react';

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';

type AppShellFrameProps = {
  readonly topBar: ReactNode;
  readonly healthBanner?: ReactNode;
  readonly leftNavigation: ReactNode;
  readonly bottomDrawer: ReactNode;
  readonly children: ReactNode;
  readonly focusMode: boolean;
  readonly showBottomDrawer: boolean;
};

export function AppShellFrame({
  topBar,
  healthBanner,
  leftNavigation,
  bottomDrawer,
  children,
  focusMode,
  showBottomDrawer,
}: AppShellFrameProps) {
  const showLeftNavigation = !focusMode;
  const showConsoleDrawer = !focusMode && showBottomDrawer;

  return (
    <div
      data-slot="app-shell-frame"
      className="app-shell-background h-screen w-screen overflow-hidden text-foreground"
    >
      <div className="flex h-full flex-col overflow-hidden">
        {topBar}
        {healthBanner}

        <div data-slot="app-shell-body" className="flex min-h-0 flex-1 overflow-hidden">
          {showLeftNavigation && (
            <div data-slot="app-shell-left-navigation" className="flex h-full shrink-0">
              {leftNavigation}
            </div>
          )}

          <div data-slot="app-shell-main" className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={showConsoleDrawer ? 78 : 100}>
                <div data-slot="app-shell-outlet" className="h-full w-full overflow-hidden">
                  {children}
                </div>
              </ResizablePanel>

              {showConsoleDrawer && (
                <>
                  <ResizableHandle />
                  <ResizablePanel defaultSize={22} minSize={12} maxSize={40}>
                    <div data-slot="app-shell-bottom-drawer" className="h-full min-h-0">
                      {bottomDrawer}
                    </div>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppShellFrame;
