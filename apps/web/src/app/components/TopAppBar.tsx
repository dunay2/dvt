import { useLocation } from 'react-router';

import { resolveWorkspaceBootstrapConfig } from '../services/config/workspaceConfig';
import { usePlatformConnectionStore } from '../stores/platformConnectionStore';
import { useSessionStore } from '../stores/sessionStore';
import { useUiLayoutStore } from '../stores/uiLayoutStore';
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
  const copy = resolveShellTopBarCopy();

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
          canvasPalette={canvasPalette}
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
