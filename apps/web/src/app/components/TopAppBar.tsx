import { useLocation } from 'react-router';

import { resolveWorkspaceBootstrapConfig } from '../services/config/workspaceConfig';
import { useSessionStore } from '../stores/sessionStore';
import { useUiLayoutStore } from '../stores/uiLayoutStore';
import { useShellRuntime } from '../shell/useShellRuntime';
import AppBrandMark from './AppBrandMark';
import { topAppBarClasses } from './shell/chrome';
import { resolveShellTopBarCopy } from './shell/copy';
import { ShellConnectionStatus } from './shell/ShellConnectionStatus';
import { ShellGitRef } from './shell/ShellGitRef';
import { ShellMenu } from './shell/ShellMenu';
import type { ShellTopBarProps } from './shell/types';
import { ShellWorkspaceSelectors } from './shell/ShellWorkspaceSelectors';
import { TooltipProvider } from './ui/tooltip';

const workspaceBootstrap = resolveWorkspaceBootstrapConfig();

function matchesSurfacePath(pathname: string, itemPath: string): boolean {
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export function ShellTopBar({
  connectionDetail,
  connectionStateOverride,
  isConnectionChecking = false,
}: ShellTopBarProps) {
  const location = useLocation();
  const selectedTenant = useSessionStore((state) => state.tenantId);
  const selectedProject = useSessionStore((state) => state.projectId);
  const selectedEnvironment = useSessionStore((state) => state.environmentId);
  const setSelectedTenant = useSessionStore((state) => state.setTenantId);
  const setSelectedProject = useSessionStore((state) => state.setProjectId);
  const setSelectedEnvironment = useSessionStore((state) => state.setEnvironmentId);
  const connectionStatus = useUiLayoutStore((state) => state.connectionStatus);
  const focusMode = useUiLayoutStore((state) => state.focusMode);
  const toggleFocusMode = useUiLayoutStore((state) => state.toggleFocusMode);
  const explorerPanelVisible = useUiLayoutStore((state) => state.explorerPanelVisible);
  const inspectorPanelVisible = useUiLayoutStore((state) => state.inspectorPanelVisible);
  const consolePanelVisible = useUiLayoutStore((state) => state.consolePanelVisible);
  const toggleExplorerPanel = useUiLayoutStore((state) => state.toggleExplorerPanel);
  const toggleInspectorPanel = useUiLayoutStore((state) => state.toggleInspectorPanel);
  const toggleConsolePanel = useUiLayoutStore((state) => state.toggleConsolePanel);
  const gridSize = useUiLayoutStore((state) => state.gridSize);
  const setGridSize = useUiLayoutStore((state) => state.setGridSize);
  const effectiveConnectionStatus = connectionStateOverride ?? connectionStatus;
  const copy = resolveShellTopBarCopy();
  const {
    navigationModel: { primaryItems, footerItems },
  } = useShellRuntime();
  const activeSurface = [...primaryItems, ...footerItems].find((item) =>
    matchesSurfacePath(location.pathname, item.to)
  );
  const ActiveSurfaceIcon = activeSurface?.icon;

  return (
    <TooltipProvider>
      <div data-slot="shell-top-bar" className={topAppBarClasses.shellBar}>
        <div className="mr-1 flex shrink-0 items-center gap-2">
          <AppBrandMark className="size-6 shrink-0" />
          <span className={topAppBarClasses.brand}>Raven</span>
        </div>

        <ShellWorkspaceSelectors
          workspaceBootstrap={workspaceBootstrap}
          selectedTenant={selectedTenant}
          selectedProject={selectedProject}
          selectedEnvironment={selectedEnvironment}
          setSelectedTenant={setSelectedTenant}
          setSelectedProject={setSelectedProject}
          setSelectedEnvironment={setSelectedEnvironment}
        />
        <ShellGitRef
          gitBranch={workspaceBootstrap.gitBranch}
          gitSha={workspaceBootstrap.gitSha}
          copy={copy}
        />
        {activeSurface && ActiveSurfaceIcon ? (
          <div
            data-slot="shell-active-surface"
            className={topAppBarClasses.contextChip}
            title={activeSurface.label}
          >
            <ActiveSurfaceIcon className={topAppBarClasses.contextChipIcon} />
            <span className={topAppBarClasses.contextChipLabel}>{activeSurface.label}</span>
          </div>
        ) : null}

        {location.pathname.startsWith('/canvas') ? (
          <div
            id="shell-top-bar-canvas-controls"
            data-slot="shell-top-bar-canvas-controls"
            className="ml-1 flex min-w-0 flex-1 items-center justify-end gap-2 overflow-hidden"
          />
        ) : (
          <div className="flex-1" />
        )}

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
          toggleExplorerPanel={toggleExplorerPanel}
          toggleInspectorPanel={toggleInspectorPanel}
          toggleConsolePanel={toggleConsolePanel}
          toggleFocusMode={toggleFocusMode}
          setGridSize={setGridSize}
          copy={copy}
        />
      </div>
    </TooltipProvider>
  );
}

export default ShellTopBar;
