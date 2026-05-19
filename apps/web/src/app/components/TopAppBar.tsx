/** Owned concern: compose global shell top-bar context, health, and command menus. */
import { useLocation } from 'react-router';

import { resolveWorkspaceBootstrapConfig } from '../services/config/workspaceConfig';
import { buildProjectIdentityBadge } from '../shell/projectIdentityBadge';
import { isWorkbenchRoute } from '../shell/shellNavigationDisposition';
import { usePlatformConnectionStore } from '../stores/platformConnectionStore';
import { useSessionStore } from '../stores/sessionStore';
import { useUiLayoutStore } from '../stores/uiLayoutStore';
import AppBrandMark from './AppBrandMark';
import { topAppBarClasses } from './shell/chrome';
import { detectShellTopBarLocale, resolveShellTopBarCopy } from './shell/copy';
import { ShellConnectionStatus } from './shell/ShellConnectionStatus';
import { ShellGitRef } from './shell/ShellGitRef';
import { ShellMenu } from './shell/ShellMenu';
import { ShellProjectIdentityBadge } from './shell/ShellProjectIdentityBadge';
import { ShellWorkspaceContextMenu } from './shell/ShellWorkspaceContextMenu';
import type { ShellTopBarProps } from './shell/types';
import { TooltipProvider } from './ui/tooltip';

const workspaceBootstrap = resolveWorkspaceBootstrapConfig();

export function ShellTopBar({
  connectionDetail,
  connectionStateOverride,
  isConnectionChecking = false,
  navigationModel,
}: ShellTopBarProps) {
  const location = useLocation();
  const selectedTenant = useSessionStore((state) => state.tenantId);
  const selectedProject = useSessionStore((state) => state.projectId);
  const selectedEnvironment = useSessionStore((state) => state.environmentId);
  const connectionStatus = usePlatformConnectionStore((state) => state.connectionStatus);
  const focusMode = useUiLayoutStore((state) => state.focusMode);
  const toggleFocusMode = useUiLayoutStore((state) => state.toggleFocusMode);
  const explorerPanelVisible = useUiLayoutStore((state) => state.explorerPanelVisible);
  const inspectorPanelVisible = useUiLayoutStore((state) => state.inspectorPanelVisible);
  const consolePanelVisible = useUiLayoutStore((state) => state.consolePanelVisible);
  const toggleExplorerPanel = useUiLayoutStore((state) => state.toggleExplorerPanel);
  const toggleInspectorPanel = useUiLayoutStore((state) => state.toggleInspectorPanel);
  const toggleConsolePanel = useUiLayoutStore((state) => state.toggleConsolePanel);
  const gridSize = useUiLayoutStore((state) => state.gridSize);
  const canvasPalette = useUiLayoutStore((state) => state.canvasPalette);
  const setGridSize = useUiLayoutStore((state) => state.setGridSize);
  const setCanvasPalette = useUiLayoutStore((state) => state.setCanvasPalette);
  const effectiveConnectionStatus = connectionStateOverride ?? connectionStatus;
  const copy = resolveShellTopBarCopy(detectShellTopBarLocale());
  const isWorkbenchShell = isWorkbenchRoute(location.pathname);
  const projectIdentityBadge = buildProjectIdentityBadge({
    workspaceBootstrap,
    selectedTenant,
    selectedProject,
    selectedEnvironment,
  });

  return (
    <TooltipProvider>
      <div data-slot="shell-top-bar" className={topAppBarClasses.shellBar}>
        <div className="mr-1 flex shrink-0 items-center gap-2">
          <AppBrandMark className="size-6 shrink-0" />
          <span className={topAppBarClasses.brand}>Raven</span>
        </div>

        {!isWorkbenchShell && (
          <>
            <ShellProjectIdentityBadge badge={projectIdentityBadge} />
            <ShellWorkspaceContextMenu badge={projectIdentityBadge} copy={copy} />
            <ShellGitRef
              gitBranch={workspaceBootstrap.gitBranch}
              gitSha={workspaceBootstrap.gitSha}
              copy={copy}
            />
          </>
        )}
        <div className="flex-1" />

        <ShellConnectionStatus
          isConnectionChecking={isConnectionChecking}
          effectiveConnectionStatus={effectiveConnectionStatus}
          connectionDetail={connectionDetail}
          copy={copy}
        />
        <ShellMenu
          explorerPanelVisible={explorerPanelVisible}
          inspectorPanelVisible={inspectorPanelVisible}
          consolePanelVisible={consolePanelVisible}
          focusMode={focusMode}
          gridSize={gridSize}
          canvasPalette={canvasPalette}
          navigationModel={navigationModel}
          projectIdentityBadge={projectIdentityBadge}
          gitBranch={workspaceBootstrap.gitBranch}
          gitSha={workspaceBootstrap.gitSha}
          toggleExplorerPanel={toggleExplorerPanel}
          toggleInspectorPanel={toggleInspectorPanel}
          toggleConsolePanel={toggleConsolePanel}
          toggleFocusMode={toggleFocusMode}
          setGridSize={setGridSize}
          setCanvasPalette={setCanvasPalette}
          copy={copy}
        />
      </div>
    </TooltipProvider>
  );
}

export default ShellTopBar;
