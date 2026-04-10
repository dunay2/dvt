import { Shield, Puzzle } from 'lucide-react';
import { NavLink } from 'react-router';

import { useShellRuntime } from '../shell/useShellRuntime';
import { resolveString } from '../plugins/contracts/PluginManifest';
import { leftNavigationRailClasses } from './shell/chrome';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from './ui/utils';

// Shell-owned fixed routes (not plugin contributions)
const SHELL_NAV = [
  { to: '/plugins', icon: Puzzle, label: 'Plugins', level: 'extended' as const },
  { to: '/admin', icon: Shield, label: 'Admin', level: 'admin' as const },
];

export function LeftNavigationRail() {
  const { navigationViews } = useShellRuntime();

  return (
    <div data-slot="left-navigation-rail" className={leftNavigationRailClasses.rail}>
      <TooltipProvider delayDuration={300}>
        <nav data-slot="left-navigation-nav" className={leftNavigationRailClasses.nav}>
          {/* Plugin-contributed nav items (core + extended), sorted by order */}
          {navigationViews.map((view) => {
            const Icon = view.nav.icon;
            const label = resolveString(view.nav.label);
            return (
              <Tooltip key={view.path}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={view.path}
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
                  <p>{label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Spacer pushes shell items to bottom */}
          <div className="flex-1" />

          {/* Shell-owned fixed nav (plugins page, admin) */}
          {SHELL_NAV.map((item) => (
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
