/** Owned concern: compose global shell top-bar context, health, and command menus. */
import { useLocation } from 'react-router';

import { resolveWorkspaceBootstrapConfig } from '../services/config/workspaceConfig';
import { buildProjectIdentityBadge } from '../shell/projectIdentityBadge';
import { resolveShellNavigationDisposition } from '../shell/shellNavigationDisposition';
import { usePlatformConnectionStore } from '../stores/platformConnectionStore';
import { useSessionStore } from '../stores/sessionStore';
import { useUiLayoutStore } from '../stores/uiLayoutStore';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';
import { CanvasWorkspaceTopBarIdentity } from '../views/canvas/CanvasWorkspaceMenuControls';
import { topAppBarClasses } from './shell/chrome';
import { resolveShellTopBarCopy } from './shell/copy';
import { useOperationalDrawerContributionStore } from './shell/operationalDrawerContributionStore';
import { ShellAppMenu } from './shell/ShellAppMenu';
import { ShellConnectionStatus } from './shell/ShellConnectionStatus';
import { ShellGitRef } from './shell/ShellGitRef';
import { ShellMenu } from './shell/ShellMenu';
import { ShellProjectIdentityBadge } from './shell/ShellProjectIdentityBadge';
import { ShellRunStatusIndicator } from './shell/ShellRunStatusIndicator';
import { ShellWorkspaceContextMenu } from './shell/ShellWorkspaceContextMenu';
import { resolveShellViewControls } from './shell/shellViewControlsModel';
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
  const selectedProjectName = useSessionStore(
    (state) =>
      state.availableWorkspaces.find(
        (workspace) =>
          workspace.tenantId === state.tenantId &&
          workspace.projectId === state.projectId &&
          workspace.environmentId === state.environmentId
      )?.projectName
  );
  const selectedEnvironment = useSessionStore((state) => state.environmentId);
  const targetAdapter = useSessionStore((state) => state.targetAdapter);
  const connectionStatus = usePlatformConnectionStore((state) => state.connectionStatus);
  const focusMode = useUiLayoutStore((state) => state.focusMode);
  const toggleFocusMode = useUiLayoutStore((state) => state.toggleFocusMode);
  const bottomDrawerVisible = useUiLayoutStore((state) => state.bottomDrawerVisible);
  const toggleBottomDrawer = useUiLayoutStore((state) => state.toggleBottomDrawer);
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const operationalDrawerContribution = useOperationalDrawerContributionStore(
    (state) => state.contribution
  );
  const effectiveConnectionStatus = connectionStateOverride ?? connectionStatus;
  const copy = resolveShellTopBarCopy(applicationLanguage);
  const navigationDisposition = resolveShellNavigationDisposition(location.pathname);
  const isWorkbenchShell = navigationDisposition.reason === 'workbench_route';
  const exposeWorkspaceNavigationMenu = focusMode || navigationDisposition.railMode === 'hidden';
  const shellViewControls = resolveShellViewControls(navigationDisposition);
  const projectIdentityBadge = buildProjectIdentityBadge({
    workspaceBootstrap,
    selectedTenant,
    selectedProject,
    selectedProjectName,
    selectedEnvironment,
    targetAdapter,
  });

  return (
    <TooltipProvider>
      <header data-slot="shell-top-bar" className={topAppBarClasses.shellBar}>
        <div
          data-slot="shell-top-bar-context-cluster"
          className="flex w-full min-w-0 items-center gap-1 sm:w-auto sm:flex-1 sm:gap-2"
        >
          <ShellAppMenu copy={copy} />

          {isWorkbenchShell ? <CanvasWorkspaceTopBarIdentity /> : null}

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
        </div>

        <div
          data-slot="shell-top-bar-command-cluster"
          className="flex w-full min-w-0 flex-wrap items-center justify-end gap-1 sm:w-auto sm:shrink-0 sm:flex-nowrap sm:gap-2"
        >
          <ShellRunStatusIndicator contribution={operationalDrawerContribution} copy={copy} />
          {exposeWorkspaceNavigationMenu && (
            <ShellMenu
              kind="workspace"
              viewControls={shellViewControls}
              bottomDrawerVisible={bottomDrawerVisible}
              focusMode={focusMode}
              navigationModel={navigationModel}
              projectIdentityBadge={projectIdentityBadge}
              gitBranch={workspaceBootstrap.gitBranch}
              gitSha={workspaceBootstrap.gitSha}
              toggleBottomDrawer={toggleBottomDrawer}
              toggleFocusMode={toggleFocusMode}
              copy={copy}
            />
          )}
          <ShellMenu
            kind="view"
            viewControls={shellViewControls}
            bottomDrawerVisible={bottomDrawerVisible}
            focusMode={focusMode}
            navigationModel={navigationModel}
            projectIdentityBadge={projectIdentityBadge}
            gitBranch={workspaceBootstrap.gitBranch}
            gitSha={workspaceBootstrap.gitSha}
            toggleBottomDrawer={toggleBottomDrawer}
            toggleFocusMode={toggleFocusMode}
            copy={copy}
          />
          <ShellConnectionStatus
            isConnectionChecking={isConnectionChecking}
            effectiveConnectionStatus={effectiveConnectionStatus}
            connectionDetail={connectionDetail}
            copy={copy}
          />
        </div>
      </header>
    </TooltipProvider>
  );
}

export default ShellTopBar;
