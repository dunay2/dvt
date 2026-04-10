import { resolveWorkspaceBootstrapConfig } from '../services/config/workspaceConfig';
import { useSessionStore } from '../stores/sessionStore';
import { useUiLayoutStore } from '../stores/uiLayoutStore';
import AppBrandMark from './AppBrandMark';
import { topAppBarClasses } from './shell/chrome';

import { TopAppBarConnectionStatus } from './topAppBar/TopAppBarConnectionStatus';
import { resolveTopAppBarCopy } from './topAppBar/copy';
import { TopAppBarGitRef } from './topAppBar/TopAppBarGitRef';
import { TopAppBarShellMenu } from './topAppBar/TopAppBarShellMenu';
import { TopAppBarWorkspaceSelectors } from './topAppBar/TopAppBarWorkspaceSelectors';
import type { TopAppBarProps } from './topAppBar/types';
import { TooltipProvider } from './ui/tooltip';

const workspaceBootstrap = resolveWorkspaceBootstrapConfig();

export function ShellTopBar({
  connectionDetail,
  connectionStateOverride,
  isConnectionChecking = false,
}: TopAppBarProps) {
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
  const copy = resolveTopAppBarCopy();

  return (
    <TooltipProvider>
      <div data-slot="shell-top-bar" className={topAppBarClasses.shellBar}>
        <div className="mr-1 flex shrink-0 items-center gap-2">
          <AppBrandMark className="size-6 shrink-0" />
          <span className={topAppBarClasses.brand}>Raven</span>
        </div>

        <TopAppBarWorkspaceSelectors
          workspaceBootstrap={workspaceBootstrap}
          selectedTenant={selectedTenant}
          selectedProject={selectedProject}
          selectedEnvironment={selectedEnvironment}
          setSelectedTenant={setSelectedTenant}
          setSelectedProject={setSelectedProject}
          setSelectedEnvironment={setSelectedEnvironment}
        />
        <TopAppBarGitRef
          gitBranch={workspaceBootstrap.gitBranch}
          gitSha={workspaceBootstrap.gitSha}
          copy={copy}
        />

        <div className="flex-1" />

        <TopAppBarConnectionStatus
          isConnectionChecking={isConnectionChecking}
          effectiveConnectionStatus={effectiveConnectionStatus}
          connectionDetail={connectionDetail}
          copy={copy}
        />
        <TopAppBarShellMenu
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
