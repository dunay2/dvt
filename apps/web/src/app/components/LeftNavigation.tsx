import { NavLink } from 'react-router';

import { useShellRuntime } from '../shell/useShellRuntime';
import { leftNavigationRailClasses } from './shell/chrome';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from './ui/utils';

export function LeftNavigationRail() {
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
                    className={({ isActive }) =>
                      cn(
                        leftNavigationRailClasses.link,
                        leftNavigationRailClasses.linkInteractive,
                        isActive && leftNavigationRailClasses.linkActive
                      )
                    }
                    data-slot="left-navigation-link"
                  >
                    <Icon className={leftNavigationRailClasses.icon} />
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
                  className={({ isActive }) =>
                    cn(
                      leftNavigationRailClasses.link,
                      leftNavigationRailClasses.linkInteractive,
                      isActive && leftNavigationRailClasses.linkActive
                    )
                  }
                  data-slot="left-navigation-link"
                >
                  <item.icon className={leftNavigationRailClasses.icon} />
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
