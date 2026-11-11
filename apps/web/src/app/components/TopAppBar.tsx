/**
 * Owned concern: compose route identity, execution, view controls and connection status.
 * @baseline GH-3765: project identity is visible; configuration has one left-rail entry.
 * @decision Keep project and file actions out of the route header.
 * @consequence Navigating routes cannot create a second project menu or scope owner.
 * @version 1.1.0
 */
import { useLocation } from 'react-router';

import { resolveShellNavigationDisposition } from '../shell/shellNavigationDisposition';
import { usePlatformConnectionStore } from '../stores/platformConnectionStore';
import { useUiLayoutStore } from '../stores/uiLayoutStore';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';
import { CanvasWorkspaceTopBarIdentity } from '../views/canvas/CanvasWorkspaceMenuControls';
import { topAppBarClasses } from './shell/chrome';
import { resolveShellTopBarCopy } from './shell/copy';
import { useOperationalDrawerContributionStore } from './shell/operationalDrawerContributionStore';
import AppBrandMark from './AppBrandMark';
import styles from './shell/ShellChrome.module.css';
import { ShellConnectionStatus } from './shell/ShellConnectionStatus';
import { ShellWorkspaceBreadcrumb } from './shell/ShellWorkspaceBreadcrumb';
import { ShellMenu } from './shell/ShellMenu';
import { ShellRunStatusIndicator } from './shell/ShellRunStatusIndicator';
import { resolveShellViewControls } from './shell/shellViewControlsModel';
import type { ShellTopBarProps } from './shell/types';
import { TooltipProvider } from './ui/tooltip';

export function ShellTopBar({
  connectionDetail,
  connectionStateOverride,
  isConnectionChecking = false,
  routeHeading = null,
}: ShellTopBarProps) {
  const location = useLocation();
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
  const shellViewControls = resolveShellViewControls(navigationDisposition);

  return (
    <TooltipProvider>
      <header data-slot="shell-top-bar" className={topAppBarClasses.shellBar}>
        <div data-slot="shell-top-bar-context-cluster" className={topAppBarClasses.contextCluster}>
          <span
            data-slot="shell-brand-identity"
            role="img"
            aria-label="Raven"
            className={styles.brandIdentity}
          >
            <AppBrandMark className={styles.appBrandMark} />
          </span>

          {routeHeading != null ? (
            <div className={styles.routeHeading} data-slot="shell-route-heading">
              <routeHeading.icon aria-hidden="true" className={styles.routeHeadingIcon} />
              <h1 className={styles.routeHeadingTitle}>{routeHeading.title}</h1>
            </div>
          ) : isWorkbenchShell ? (
            <CanvasWorkspaceTopBarIdentity />
          ) : null}
          <ShellWorkspaceBreadcrumb copy={copy} />
        </div>

        <div data-slot="shell-top-bar-command-cluster" className={topAppBarClasses.commandCluster}>
          <ShellRunStatusIndicator contribution={operationalDrawerContribution} copy={copy} />
          <ShellMenu
            viewControls={shellViewControls}
            bottomDrawerVisible={bottomDrawerVisible}
            focusMode={focusMode}
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
