import {
  LayoutGrid,
  PlayCircle,
  FileText,
  GitCompare,
  GitGraph,
  DollarSign,
  Puzzle,
  Shield,
} from 'lucide-react';
import { NavLink } from 'react-router';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from './ui/utils';

const navItems = [
  { to: '/canvas', icon: LayoutGrid, label: 'Canvas' },
  { to: '/runs', icon: PlayCircle, label: 'Runs' },
  { to: '/artifacts', icon: FileText, label: 'Artifacts' },
  { to: '/diff', icon: GitCompare, label: 'Diff' },
  { to: '/lineage', icon: GitGraph, label: 'Lineage' },
  { to: '/cost', icon: DollarSign, label: 'Cost & Observability' },
  { to: '/plugins', icon: Puzzle, label: 'Plugins' },
  { to: '/admin', icon: Shield, label: 'Admin' },
];

export default function LeftNavigation() {
  return (
    <div className="bg-slate-900 border-r border-slate-700 w-14">
      <TooltipProvider delayDuration={300}>
        <nav className="flex h-full flex-col items-center gap-2 overflow-y-auto py-3">
          {navItems.map((item) => (
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

