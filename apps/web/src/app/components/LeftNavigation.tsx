import { Shield, Puzzle } from 'lucide-react';
import { NavLink } from 'react-router';

import { useCapabilitiesQuery } from '../queries/useCapabilitiesQuery';
import { getNavigationViews } from '../plugins/registry';
import { resolveString } from '../plugins/contracts/PluginManifest';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from './ui/utils';

// Shell-owned fixed routes (not plugin contributions)
const SHELL_NAV = [
  { to: '/plugins', icon: Puzzle, label: 'Plugins', level: 'extended' as const },
  { to: '/admin', icon: Shield, label: 'Admin', level: 'admin' as const },
];

export default function LeftNavigation() {
  const { data: capabilities } = useCapabilitiesQuery();
  const pluginViews = getNavigationViews(capabilities);

  return (
    <div className="bg-slate-900 border-r border-slate-700 w-14">
      <TooltipProvider delayDuration={300}>
        <nav className="flex h-full flex-col items-center gap-2 overflow-y-auto py-3">
          {/* Plugin-contributed nav items (core + extended), sorted by order */}
          {pluginViews.map((view) => {
            const Icon = view.nav.icon;
            const label = resolveString(view.nav.label);
            return (
              <Tooltip key={view.path}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={view.path}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-center h-10 w-10 text-slate-300 border border-transparent rounded-lg transition-colors',
                        'hover:bg-slate-950 hover:text-white',
                        isActive && 'bg-slate-950 text-white border-blue-500'
                      )
                    }
                  >
                    <Icon className="size-6" />
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
                      'flex items-center justify-center h-10 w-10 text-slate-300 border border-transparent rounded-lg transition-colors',
                      'hover:bg-slate-950 hover:text-white',
                      isActive && 'bg-slate-950 text-white border-blue-500'
                    )
                  }
                >
                  <item.icon className="size-6" />
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
