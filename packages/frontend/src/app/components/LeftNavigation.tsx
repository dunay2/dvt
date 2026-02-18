import {
  LayoutGrid,
  GitBranch,
  PlayCircle,
  FileText,
  GitCompare,
  GitGraph,
  DollarSign,
  Puzzle,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { NavLink } from 'react-router';
import { useAppStore } from '../stores/appStore';
import { Button } from './ui/button';
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
  const { leftNavCollapsed } = useAppStore();

  return (
    <div className="bg-[#0f1116] border-r border-gray-800 flex flex-col w-14">
      {/* Navigation Items - Icon Only */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <TooltipProvider delayDuration={300}>
          {navItems.map((item) => (
            <Tooltip key={item.to}>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-center h-12 my-1 text-gray-400 hover:bg-[#1a1d23] hover:text-white transition-colors relative rounded-md',
                      isActive &&
                        'bg-[#1a1d23] text-white before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-blue-500'
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
        </TooltipProvider>
      </nav>
    </div>
  );
}
