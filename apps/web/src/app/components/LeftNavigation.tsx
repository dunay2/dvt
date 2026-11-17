/** Owned concern: present direct shell destinations and compose the active contextual rail. */
import { NavLink, useMatch } from 'react-router';
import { GitFork } from 'lucide-react';
import type { ShellNavigationItem, ShellNavigationModel } from '../shell/shellNavigationModel';
import { useUiLayoutStore } from '../stores/uiLayoutStore';
import { useCanvasWorkspaceMenuContributionStore } from '../views/canvas/canvasWorkspaceMenuContributionStore';
import { canvasCodeRouteEntryState } from '../views/canvas/CanvasCodeRouteEntry';
import { ShellAbout } from './shell/ShellAbout';
import { ShellProjectMenu } from './shell/ShellProjectMenu';
import { ShellNavigationSectionMenu } from './shell/ShellNavigationSectionMenu';
import { ShellModelViewNavigation } from './shell/ShellModelViewNavigation';
import type { ShellTopBarCopy } from './shell/copy';
import styles from './LeftNavigation.module.css';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from './ui/utils';

export function LeftNavigationRail({
  navigationModel,
  copy,
}: Readonly<{
  navigationModel: ShellNavigationModel;
  copy: ShellTopBarCopy;
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
  const renderDestination = (item: ShellNavigationItem): JSX.Element => {
    if (item.sections != null)
      return (
        <ShellNavigationSectionMenu
          key={item.to}
          item={{ ...item, sections: item.sections }}
          triggerClassName={cn(styles.link, styles.linkInteractive)}
          iconClassName={styles.icon}
          captionClassName={styles.caption}
        />
      );
    const Icon = item.icon;
    const isCanvas = item.to === '/canvas';
    return (
      <Tooltip key={item.to}>
        <TooltipTrigger asChild>
          <NavLink
            to={item.to}
            id={isCanvas ? 'shell-canvas-navigation' : undefined}
            aria-label={item.label}
            data-active={
              isCanvas
                ? onCanvasRoute &&
                  codeTab?.active !== true &&
                  modelTab?.active !== true &&
                  modelBrowser?.mode == null
                : undefined
            }
            aria-expanded={
              isCanvas && onCanvasRoute ? expanded && codeTab?.active !== true : undefined
            }
            className={cn(styles.link, styles.linkInteractive)}
            data-slot="left-navigation-link"
            onClick={(event) => {
              if (
                !isCanvas ||
                !onCanvasRoute ||
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              event.preventDefault();
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <NavLink
                    to={canvasItem.to}
                    state={canvasCodeRouteEntryState}
                    id="shell-project-code-command"
                    data-slot="shell-project-code-command"
                    data-active={onCanvasRoute && codeTab?.active === true}
                    aria-label={copy.projectCode}
                    aria-current={false}
                    aria-expanded={onCanvasRoute && codeTab?.active === true}
                    aria-controls={
                      onCanvasRoute && codeTab?.active === true
                        ? 'canvas-code-workspace-surface'
                        : undefined
                    }
                    aria-disabled={
                      onCanvasRoute &&
                      (!contribution?.canOpenProjectCode || contribution.onOpenProjectCode == null)
                        ? true
                        : undefined
                    }
                    className={cn(styles.link, styles.linkInteractive)}
                    onClick={(event) => {
                      if (
                        !onCanvasRoute ||
                        event.defaultPrevented ||
                        event.button !== 0 ||
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey
                      )
                        return;
                      event.preventDefault();
                      if (contribution?.canOpenProjectCode) contribution.onOpenProjectCode?.();
                    }}
                  >
                    <GitFork aria-hidden="true" className={styles.icon} />
                    <span className={styles.caption}>{copy.projectCode}</span>
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right">{copy.projectCode}</TooltipContent>
              </Tooltip>
            )}
            {canvasItem == null ? null : (
              <ShellModelViewNavigation
                tab={modelTab}
                browser={modelBrowser}
                available={onCanvasRoute}
                foreground={codeTab?.active !== true}
                copy={copy}
              />
            )}
            <div className={cn(styles.nav, styles.destinations)}>
              {items.filter((item) => item !== canvasItem).map(renderDestination)}
            </div>
          </nav>
        </div>
        <div className={styles.footer}>
          <ShellProjectMenu copy={copy} />
          <ShellAbout copy={copy} />
        </div>
      </TooltipProvider>
    </div>
  );
}

export default LeftNavigationRail;
