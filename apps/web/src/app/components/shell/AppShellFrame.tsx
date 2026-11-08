/** Owned concern: lay out shell chrome slots from already-resolved presentation posture. */
import type { ReactNode } from 'react';

import { ShellActivityRailProvider } from './ShellActivityRail';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import { OPERATIONAL_DRAWER_PERCENT } from './appShellPanelSizing';
import {
  OPERATIONAL_DRAWER_GROUP_ID,
  useOperationalDrawerResize,
} from './useOperationalDrawerResize';

type AppShellFrameProps = {
  readonly topBar: ReactNode;
  readonly healthBanner?: ReactNode;
  readonly leftNavigation: ReactNode;
  readonly bottomDrawer: ReactNode;
  readonly bottomDrawerHeight: number;
  readonly onBottomDrawerHeightChange: (height: number) => void;
  readonly children: ReactNode;
  readonly focusMode: boolean;
  readonly showBottomDrawer: boolean;
  readonly skipToMainContentLabel: string;
};

export const APP_SHELL_MAIN_CONTENT_ID = 'app-shell-main-content';

export function AppShellFrame({
  topBar,
  healthBanner,
  leftNavigation,
  bottomDrawer,
  bottomDrawerHeight,
  onBottomDrawerHeightChange,
  children,
  focusMode,
  showBottomDrawer,
  skipToMainContentLabel,
}: AppShellFrameProps) {
  const showLeftNavigation = !focusMode;
  const showOperationalDrawer = !focusMode && showBottomDrawer;
  const drawerResize = useOperationalDrawerResize({
    height: bottomDrawerHeight,
    visible: showOperationalDrawer,
    onHeightChange: onBottomDrawerHeightChange,
  });
  const focusMainContent = (): void => {
    document.getElementById(APP_SHELL_MAIN_CONTENT_ID)?.focus({ preventScroll: true });
  };

  return (
    <ShellActivityRailProvider>
      <div
        data-slot="app-shell-frame"
        className="app-shell-background h-screen w-screen overflow-hidden text-foreground"
        // Bubble after component-owned menus; capture would prevent Radix from opening.
        onContextMenu={(event) => event.preventDefault()}
      >
        <a
          data-slot="app-shell-skip-link"
          href={`#${APP_SHELL_MAIN_CONTENT_ID}`}
          onClick={(event) => {
            event.preventDefault();
            focusMainContent();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              focusMainContent();
            }
          }}
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

            <div
              data-slot="app-shell-main"
              ref={drawerResize.groupHostRef}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <ResizablePanelGroup direction="vertical" id={OPERATIONAL_DRAWER_GROUP_ID}>
                <ResizablePanel
                  id="app-shell-route-outlet-panel"
                  order={1}
                  defaultSize={showOperationalDrawer ? 100 - drawerResize.defaultSize : 100}
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
                    <ResizableHandle
                      id="app-shell-bottom-drawer-resize-handle"
                      withHandle
                      onDragging={drawerResize.onDragging}
                      onKeyDownCapture={drawerResize.onKeyDownCapture}
                      onKeyUpCapture={drawerResize.onKeyUpCapture}
                      onBlur={drawerResize.onBlur}
                    />
                    <ResizablePanel
                      ref={drawerResize.panelRef}
                      id="app-shell-bottom-drawer-panel"
                      order={2}
                      defaultSize={drawerResize.defaultSize}
                      minSize={drawerResize.minSize}
                      maxSize={OPERATIONAL_DRAWER_PERCENT.max}
                      onResize={drawerResize.onResize}
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
    </ShellActivityRailProvider>
  );
}

export default AppShellFrame;
