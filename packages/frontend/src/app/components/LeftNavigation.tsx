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
  { to: '/canvas', icon: LayoutGrid, tooltip: 'Canvas', shortcut: 'Ctrl+Shift+C' },
  { to: '/runs', icon: PlayCircle, tooltip: 'Runs', shortcut: 'Ctrl+Shift+R' },
  { to: '/artifacts', icon: FileText, tooltip: 'Artifacts', shortcut: 'Ctrl+Shift+A' },
  { to: '/diff', icon: GitCompare, tooltip: 'Diff', shortcut: 'Ctrl+Shift+D' },
  { to: '/lineage', icon: GitGraph, tooltip: 'Lineage', shortcut: 'Ctrl+Shift+L' },
  { to: '/cost', icon: DollarSign, tooltip: 'Cost & Observability', shortcut: 'Ctrl+Shift+O' },
  { to: '/plugins', icon: Puzzle, tooltip: 'Plugins', shortcut: 'Ctrl+Shift+P' },
  { to: '/admin', icon: Shield, tooltip: 'Admin', shortcut: 'Ctrl+Shift+,' },
];

export default function LeftNavigation() {
  return (
    <div className="w-16 bg-[#0f1116] border-r border-gray-800 flex flex-col overflow-hidden">
      <nav className="flex flex-col items-center gap-2 py-3 flex-1">
        {navItems.map((item) => (
          <TooltipProvider key={item.to}>
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.to}
                  aria-label={item.tooltip}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-center w-full p-3 text-gray-400 transition-colors duration-200',
                      'hover:text-white hover:bg-[#1a1d23]',
                      isActive && 'text-white border-l-4 border-blue-500'
                    )
                  }
                >
                  <item.icon className="size-5" />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent className="bg-[#0f1116] border border-gray-800 text-white">
                <div className="text-sm font-medium">{item.tooltip}</div>
                <div className="text-xs text-gray-500">{item.shortcut}</div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </nav>
    </div>
  );
}
