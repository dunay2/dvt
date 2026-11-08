/** Owned concern: present direct shell destinations and compose the active contextual rail. */
import { NavLink } from 'react-router';
import type { ShellNavigationModel } from '../shell/shellNavigationModel';
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
  return (
    <div data-slot="left-navigation-rail" className={styles.rail}>
      <TooltipProvider delayDuration={300}>
        <div className={styles.scroll}>
          <ShellActivityRailHost />
          <nav
            data-slot="left-navigation-nav"
            className={styles.nav}
            aria-label={copy.globalNavigation}
          >
            {[...navigationModel.primaryItems, ...navigationModel.footerItems].map((item) => {
              const Icon = item.icon;
              return (
                <Tooltip key={item.to}>
                  <TooltipTrigger asChild>
                    <NavLink
                      to={item.to}
                      aria-label={item.label}
                      className={cn(styles.link, styles.linkInteractive)}
                      data-slot="left-navigation-link"
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
            })}
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
