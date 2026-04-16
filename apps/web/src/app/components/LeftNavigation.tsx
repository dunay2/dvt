import { NavLink, useLocation } from 'react-router';

import { useShellRuntime } from '../shell/useShellRuntime';
import { leftNavigationRailClasses } from './shell/chrome';
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
    <div data-slot="left-navigation-rail" className={leftNavigationRailClasses.rail}>
      <TooltipProvider delayDuration={300}>
        <nav data-slot="left-navigation-nav" className={leftNavigationRailClasses.nav}>
          {primaryItems.map((item) => {
            const Icon = item.icon;
            return (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.to}
                    className={cn(
                      leftNavigationRailClasses.link,
                      leftNavigationRailClasses.linkInteractive,
                      isNavigationItemActive(location.pathname, item.to) &&
                        leftNavigationRailClasses.linkActive
                    )}
                    data-slot="left-navigation-link"
                  >
                    <Icon className={leftNavigationRailClasses.icon} />
                    <span
                      data-slot="left-navigation-caption"
                      className={leftNavigationRailClasses.caption}
                    >
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

          <div className="flex-1" />

          {footerItems.map((item) => (
            <Tooltip key={item.to}>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.to}
                  className={cn(
                    leftNavigationRailClasses.link,
                    leftNavigationRailClasses.linkInteractive,
                    isNavigationItemActive(location.pathname, item.to) &&
                      leftNavigationRailClasses.linkActive
                  )}
                  data-slot="left-navigation-link"
                >
                  <item.icon className={leftNavigationRailClasses.icon} />
                  <span
                    data-slot="left-navigation-caption"
                    className={leftNavigationRailClasses.caption}
                  >
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
