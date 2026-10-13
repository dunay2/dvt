/**
 * Owned concern: present shell navigation destinations and their active state.
 * @baseline GH-3629: navigation appearance does not depend on the TopBar stylesheet.
 * @decision Import concern-owned CSS directly while retaining the existing navigation read model.
 * @consequence Route selection, links and keyboard focus retain their current behavior.
 * @version 1.0.0
 */
import { NavLink, useLocation } from 'react-router';

import { useShellRuntime } from '../shell/useShellRuntime';
import styles from './LeftNavigation.module.css';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from './ui/utils';

function isNavigationItemActive(pathname: string, targetPath: string): boolean {
  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

export function LeftNavigationRail() {
  const location = useLocation();
  const {
    navigationModel: { primaryItems, footerItems },
  } = useShellRuntime();

  return (
    <div data-slot="left-navigation-rail" className={styles.rail}>
      <TooltipProvider delayDuration={300}>
        <nav data-slot="left-navigation-nav" className={styles.nav}>
          {primaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.to}
                    className={cn(
                      styles.link,
                      styles.linkInteractive,
                      isNavigationItemActive(location.pathname, item.to) && styles.linkActive
                    )}
                    data-slot="left-navigation-link"
                  >
                    <Icon className={styles.icon} />
                    <span data-slot="left-navigation-caption" className={styles.caption}>
                      {item.label}
                    </span>
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}

          <div className={styles.spacer} />

          {footerItems.map((item) => (
            <Tooltip key={item.to}>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.to}
                  className={cn(
                    styles.link,
                    styles.linkInteractive,
                    isNavigationItemActive(location.pathname, item.to) && styles.linkActive
                  )}
                  data-slot="left-navigation-link"
                >
                  <item.icon className={styles.icon} />
                  <span data-slot="left-navigation-caption" className={styles.caption}>
                    {item.label}
                  </span>
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{item.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>
      </TooltipProvider>
    </div>
  );
}

export default LeftNavigationRail;
