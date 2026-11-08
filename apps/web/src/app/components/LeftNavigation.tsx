/** Owned concern: present direct shell destinations and compose the active contextual rail. */
import { NavLink, useMatch } from 'react-router';
import type { ShellNavigationItem, ShellNavigationModel } from '../shell/shellNavigationModel';
import { useUiLayoutStore } from '../stores/uiLayoutStore';
import { useCanvasWorkspaceMenuContributionStore } from '../views/canvas/canvasWorkspaceMenuContributionStore';
import { ShellActivityRailHost } from './shell/ShellActivityRail';
import { ShellAbout } from './shell/ShellAbout';
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
  const codeTab = useCanvasWorkspaceMenuContributionStore((state) => state.contribution?.codeTab);
  const items = [...navigationModel.primaryItems, ...navigationModel.footerItems];
  const canvasItem = items.find((item) => item.to === '/canvas');
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
              if (codeTab?.active === true) codeTab.onCanvas();
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
            className={styles.nav}
            aria-label={copy.globalNavigation}
          >
            {canvasItem == null ? null : renderDestination(canvasItem)}
            <ShellActivityRailHost />
            <div className={cn(styles.nav, styles.destinations)}>
              {items.filter((item) => item !== canvasItem).map(renderDestination)}
            </div>
          </nav>
        </div>
        <div className={styles.footer}>
          <ShellAbout copy={copy} />
        </div>
      </TooltipProvider>
    </div>
  );
}

export default LeftNavigationRail;
