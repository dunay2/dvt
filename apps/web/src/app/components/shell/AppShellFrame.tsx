/** Owned concern: lay out shell chrome slots from already-resolved presentation posture. */
import type { ReactNode } from 'react';

import type { ShellNavigationDisposition } from '../../shell/shellNavigationDisposition';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';

type AppShellFrameProps = {
  readonly topBar: ReactNode;
  readonly healthBanner?: ReactNode;
  readonly leftNavigation: ReactNode;
  readonly bottomDrawer: ReactNode;
  readonly children: ReactNode;
  readonly focusMode: boolean;
  readonly navigationDisposition: ShellNavigationDisposition;
  readonly showBottomDrawer: boolean;
  readonly skipToMainContentLabel: string;
};

export const APP_SHELL_MAIN_CONTENT_ID = 'app-shell-main-content';

export function AppShellFrame({
  topBar,
  healthBanner,
  leftNavigation,
  bottomDrawer,
  children,
  focusMode,
  navigationDisposition,
  showBottomDrawer,
  skipToMainContentLabel,
}: AppShellFrameProps) {
  const showLeftNavigation = !focusMode && navigationDisposition.railMode === 'visible';
  const showOperationalDrawer = !focusMode && showBottomDrawer;

  return (
    <div
      data-slot="app-shell-frame"
      className="app-shell-background h-screen w-screen overflow-hidden text-foreground"
    >
      <a
        data-slot="app-shell-skip-link"
        href={`#${APP_SHELL_MAIN_CONTENT_ID}`}
        className="sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-[var(--surface-elevated)] focus:px-3 focus:py-2 focus:text-sm focus:text-[var(--text-strong)] focus:not-sr-only focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
      >
        {skipToMainContentLabel}
      </a>
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
            <ResizablePanelGroup direction="vertical" id="app-shell-vertical-panels">
              <ResizablePanel
                id="app-shell-route-outlet-panel"
                order={1}
                defaultSize={showOperationalDrawer ? 78 : 100}
              >
                <main
                  id={APP_SHELL_MAIN_CONTENT_ID}
                  tabIndex={-1}
                  data-slot="app-shell-outlet"
                  className="h-full w-full overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-inset"
                >
                  {children}
                </main>
              </ResizablePanel>

              {showOperationalDrawer && (
                <>
                  <ResizableHandle id="app-shell-bottom-drawer-resize-handle" />
                  <ResizablePanel
                    id="app-shell-bottom-drawer-panel"
                    order={2}
                    defaultSize={22}
                    minSize={12}
                    maxSize={40}
                  >
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
