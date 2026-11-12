/**
 * Owned concern: lay out shell chrome slots from already-resolved presentation posture.
 * @baseline Route content and resize admission retain their existing owners.
 * @decision Keep slot composition here and semantic visual rules in the CSS module.
 * @consequence Focus mode and drawer resizing cannot introduce a second route lifetime.
 * @version 1.1.0
 */
import type { ReactNode } from 'react';
import styles from './AppShellFrame.module.css';

import { ShellActivityRailProvider } from './ShellActivityRail';
import { ShellTextSelectionBoundary } from './ShellTextSelectionBoundary';
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
      <ShellTextSelectionBoundary>
        <div
          data-slot="app-shell-frame"
          className={styles.frame}
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
            className={styles.skipLink}
          >
            {skipToMainContentLabel}
          </a>
          <div className={styles.column}>
            <div
              data-slot="app-shell-header-host"
              data-focus-mode={focusMode}
              className={styles.headerHost}
            >
              {topBar}
            </div>
            {healthBanner}

            <div data-slot="app-shell-body" className={styles.body}>
              {showLeftNavigation && (
                <div data-slot="app-shell-left-navigation" className={styles.navigation}>
                  {leftNavigation}
                </div>
              )}

              <div
                data-slot="app-shell-main"
                ref={drawerResize.groupHostRef}
                className={styles.main}
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
                      className={styles.outlet}
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
                        <div data-slot="app-shell-bottom-drawer" className={styles.drawer}>
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
      </ShellTextSelectionBoundary>
    </ShellActivityRailProvider>
  );
}

export default AppShellFrame;
