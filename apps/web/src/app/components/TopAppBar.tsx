import {
  Activity,
  Bell,
  Database,
  GitBranch,
  Maximize2,
  Menu,
  Minimize2,
  PanelLeftClose,
  PanelRightClose,
  TerminalSquare,
  User,
} from 'lucide-react';

import { useAppStore } from '../stores/appStore';

import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const GRID_OPTIONS = [
  { value: 10, label: '10px (Dense)' },
  { value: 15, label: '15px' },
  { value: 20, label: '20px (Default)' },
  { value: 30, label: '30px' },
  { value: 40, label: '40px (Sparse)' },
];

export default function TopAppBar() {
  const {
    selectedTenant,
    selectedProject,
    selectedEnvironment,
    gitBranch,
    gitSha,
    connectionStatus,
    focusMode,
    toggleFocusMode,
    setSelectedTenant,
    setSelectedProject,
    setSelectedEnvironment,
    explorerPanelVisible,
    inspectorPanelVisible,
    consolePanelVisible,
    toggleExplorerPanel,
    toggleInspectorPanel,
    toggleConsolePanel,
    gridSize,
    setGridSize,
  } = useAppStore();

  const getStatusColor = () => {
    switch (connectionStatus.rest) {
      case 'ok':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = () => {
    if (connectionStatus.rest === 'ok' && connectionStatus.liveEvents === 'connected') {
      return 'Online';
    }

    if (connectionStatus.rest === 'ok' && connectionStatus.liveEvents === 'polling') {
      return 'Online (Polling)';
    }

    if (connectionStatus.rest === 'degraded') {
      return 'Degraded';
    }

    return 'Offline';
  };

  const showInlineStatus = connectionStatus.rest === 'ok';

  return (
    <TooltipProvider>
      <div className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-4 gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 mr-2">
          <Database className="size-6 text-blue-400" />
          <span className="font-semibold text-lg">DVT+</span>
        </div>

        <Select value={selectedTenant} onValueChange={setSelectedTenant}>
          <SelectTrigger className="w-[140px] bg-slate-950 border-slate-600">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="acme-corp">ACME Corp</SelectItem>
            <SelectItem value="globex">Globex Inc</SelectItem>
            <SelectItem value="initech">Initech</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-[160px] bg-slate-950 border-slate-600">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dbt-analytics">dbt-analytics</SelectItem>
            <SelectItem value="dbt-marketing">dbt-marketing</SelectItem>
            <SelectItem value="dbt-finance">dbt-finance</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
          <SelectTrigger className="w-[120px] bg-slate-950 border-slate-600">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dev">dev</SelectItem>
            <SelectItem value="stage">stage</SelectItem>
            <SelectItem value="prod">prod</SelectItem>
          </SelectContent>
        </Select>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-600 rounded-md text-sm">
              <GitBranch className="size-4 text-slate-300" />
              <span>{gitBranch}</span>
              <span className="text-slate-400">@</span>
              <code className="text-xs text-slate-300">{gitSha}</code>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Current Git branch and commit SHA</p>
          </TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        {showInlineStatus && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-600 rounded-md text-sm cursor-default">
                <div className={`size-2 rounded-full ${getStatusColor()}`} />
                <Activity className="size-4 text-slate-300" />
                <span className="text-xs">{getStatusLabel()}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>REST API: {connectionStatus.rest}</p>
              <p>Live Events: {connectionStatus.liveEvents}</p>
            </TooltipContent>
          </Tooltip>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="text-slate-200 hover:text-white gap-2">
              <Menu className="size-4" />
              Shell
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Workspace controls</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={explorerPanelVisible}
              onCheckedChange={toggleExplorerPanel}
            >
              <PanelLeftClose className="size-4 mr-2" />
              Explorer Panel
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={inspectorPanelVisible}
              onCheckedChange={toggleInspectorPanel}
            >
              <PanelRightClose className="size-4 mr-2" />
              Inspector Panel
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={consolePanelVisible}
              onCheckedChange={toggleConsolePanel}
            >
              <TerminalSquare className="size-4 mr-2" />
              Console
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={focusMode} onCheckedChange={toggleFocusMode}>
              {focusMode ? (
                <Minimize2 className="size-4 mr-2" />
              ) : (
                <Maximize2 className="size-4 mr-2" />
              )}
              Focus Mode
            </DropdownMenuCheckboxItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Grid size: {gridSize}px</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {GRID_OPTIONS.map((option) => (
                  <DropdownMenuItem key={option.value} onClick={() => setGridSize(option.value)}>
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
            <DropdownMenuItem>
              <Bell className="size-4 mr-2" />
              Notifications
              <Badge className="ml-auto size-4 p-0 flex items-center justify-center bg-red-500 text-[10px]">
                3
              </Badge>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>john.doe@company.com</DropdownMenuLabel>
            <DropdownMenuItem>
              <User className="size-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem>API Keys</DropdownMenuItem>
            <DropdownMenuItem>Documentation</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}

