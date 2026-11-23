/** Owned concern: present direct shell destinations and compose the active contextual rail. */
import { NavLink, useMatch } from 'react-router';
import type { ShellNavigationItem, ShellNavigationModel } from '../shell/shellNavigationModel';
import { useUiLayoutStore } from '../stores/uiLayoutStore';
import { useCanvasWorkspaceMenuContributionStore } from '../views/canvas/canvasWorkspaceMenuContributionStore';
import { ShellAbout } from './shell/ShellAbout';
import {
  isDirectShellLinkActivation,
  ShellProjectCodeLink,
  ShellProjectMenu,
} from './shell/ShellProjectMenu';
import { ShellModelViewNavigation } from './shell/ShellModelViewNavigation';
import type { ShellTopBarCopy } from './shell/copy';
import { ShellOperationalRail } from './shell/ShellOperationalRail';
import type { ShellOperationalView } from './shell/types';
import styles from './LeftNavigation.module.css';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from './ui/utils';

export function LeftNavigationRail({
  navigationModel,
  copy,
  operationalView,
  onOperationalViewChange,
}: Readonly<{
  navigationModel: ShellNavigationModel;
  copy: ShellTopBarCopy;
  operationalView?: ShellOperationalView | null;
  onOperationalViewChange?: (view: ShellOperationalView | null) => void;
}>) {
  const onCanvasRoute = useMatch('/canvas/*') != null;
  const expanded = useUiLayoutStore((state) => state.canvasExplorer.mode === 'expanded');
  const dispatch = useUiLayoutStore((state) => state.dispatchCanvasExplorer);
  const contribution = useCanvasWorkspaceMenuContributionStore((state) => state.contribution);
  const codeTab = contribution?.codeTab;
  const registeredModelTab = useCanvasWorkspaceMenuContributionStore((state) => state.modelTab);
  const modelTab =
    contribution?.activeCanvas?.id === registeredModelTab?.canvasId ? registeredModelTab : null;
  const registeredBrowser = useCanvasWorkspaceMenuContributionStore((state) => state.modelBrowser);
  const modelBrowser =
    contribution?.activeCanvas?.id === registeredBrowser?.canvasId ? registeredBrowser : null;
  const items = [...navigationModel.primaryItems, ...navigationModel.footerItems];
  const canvasItem = items.find((item) => item.to === '/canvas');
  const adminItem = items.find((item) => item.to === '/admin');
  const costItem = items.find((item) => item.to === '/cost');
  const routeActiveOverride = operationalView == null ? undefined : false;
  const canvasActive =
    operationalView == null &&
    onCanvasRoute &&
    codeTab?.active !== true &&
    modelTab?.active !== true &&
    modelBrowser?.mode == null;
  const renderDestination = (item: ShellNavigationItem): JSX.Element => {
    const Icon = item.icon;
    const isCanvas = item.to === '/canvas';
    return (
      <Tooltip key={item.to}>
        <TooltipTrigger asChild>
          <NavLink
            to={item.to}
            id={isCanvas ? 'shell-canvas-navigation' : undefined}
            aria-label={item.label}
            data-active={isCanvas ? canvasActive : routeActiveOverride}
            aria-expanded={
              isCanvas && onCanvasRoute ? expanded && codeTab?.active !== true : undefined
            }
            className={cn(styles.link, styles.linkInteractive)}
            data-slot="left-navigation-link"
            onClick={(event) => {
              if (!isDirectShellLinkActivation(event)) return;
              onOperationalViewChange?.(null);
              if (!isCanvas || !onCanvasRoute) return;
              event.preventDefault();
              if (operationalView != null) return;
              // Reuse the published owner callback; opening Elements does not close its session.
              if (modelBrowser?.mode != null) modelBrowser.onCanvas();
              else if (codeTab?.active === true) codeTab.onCanvas();
              else if (modelTab?.active === true) modelTab.onCanvas();
              dispatch({ type: 'expand' });
            }}
          >
            <Icon aria-hidden="true" className={styles.icon} />
            <span data-slot="left-navigation-caption" className={styles.caption}>
              {item.label}
            </span>
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  };
  return (
    <div data-slot="left-navigation-rail" className={styles.rail}>
      <TooltipProvider delayDuration={300}>
        <div className={styles.scroll}>
          <nav
            data-slot="left-navigation-nav"
            data-workbench-navigation=""
            className={styles.nav}
            aria-label={copy.globalNavigation}
          >
            {canvasItem == null ? null : renderDestination(canvasItem)}
            {canvasItem == null ? null : (
              <ShellModelViewNavigation
                tab={modelTab}
                browser={modelBrowser}
                available={onCanvasRoute}
                entryPath={canvasItem.to}
                foreground={operationalView == null && codeTab?.active !== true}
                onActivate={() => onOperationalViewChange?.(null)}
                copy={copy}
              />
            )}
            <div className={cn(styles.nav, styles.destinations)}>
              {items
                .filter((item) => item !== canvasItem && item !== adminItem && item !== costItem)
                .map(renderDestination)}
            </div>
            {onOperationalViewChange == null ? null : (
              <ShellOperationalRail
                onCanvasRoute={onCanvasRoute}
                operationalView={operationalView ?? null}
                onOperationalViewChange={onOperationalViewChange}
                copy={copy}
              />
            )}
            {adminItem == null ? null : renderDestination(adminItem)}
          </nav>
        </div>
        <div className={styles.footer}>
          {costItem == null ? null : renderDestination(costItem)}
          {canvasItem == null ? null : (
            <ShellProjectCodeLink
              to={canvasItem.to}
              label={copy.projectCode}
              onCanvasRoute={onCanvasRoute}
              foreground={operationalView == null}
              onActivate={() => onOperationalViewChange?.(null)}
            />
          )}
          <ShellProjectMenu copy={copy} />
          <ShellAbout copy={copy} />
        </div>
      </TooltipProvider>
    </div>
  );
}

export default LeftNavigationRail;
