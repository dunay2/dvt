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

const NAV_LINK_CLASS =
  'flex size-10 items-center justify-center rounded-xl border border-transparent text-slate-300 transition-colors shrink-0';

const NAV_ICON_CLASS = 'size-[18px] shrink-0';

export default function LeftNavigation() {
  const { data: capabilities } = useCapabilitiesQuery();
  const pluginViews = getNavigationViews(capabilities);

  return (
    <div className="w-16 shrink-0 border-r border-slate-700 bg-slate-900">
      <TooltipProvider delayDuration={300}>
        <nav className="flex h-full flex-col items-center gap-3.5 overflow-y-auto py-4">
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
                        NAV_LINK_CLASS,
                        'hover:bg-slate-950 hover:text-white',
                        isActive && 'bg-slate-950 text-white border-blue-500'
                      )
                    }
                  >
                    <Icon className={NAV_ICON_CLASS} />
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
                      NAV_LINK_CLASS,
                      'hover:bg-slate-950 hover:text-white',
                      isActive && 'bg-slate-950 text-white border-blue-500'
                    )
                  }
                >
                  <item.icon className={NAV_ICON_CLASS} />
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
