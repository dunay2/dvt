import {
  Activity,
  AlertTriangle,
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
  WifiOff,
} from 'lucide-react';

import { resolveWorkspaceBootstrapConfig } from '../services/config/workspaceConfig';
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

const workspaceBootstrap = resolveWorkspaceBootstrapConfig();

type TopAppBarProps = {
  readonly connectionDetail?: string | null;
};

export default function TopAppBar({ connectionDetail }: TopAppBarProps) {
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

  return (
    <TooltipProvider>
      <div className="h-10 bg-slate-900 border-b border-slate-700 flex items-center px-3 gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 mr-1 shrink-0">
          <Database className="size-5 text-blue-400" />
          <span className="font-semibold text-base leading-none">DVT+</span>
        </div>

        <Select value={selectedTenant} onValueChange={setSelectedTenant}>
          <SelectTrigger className="h-8 w-[138px] bg-slate-950 border-slate-600">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {workspaceBootstrap.tenantOptions.map((tenantOption) => (
              <SelectItem key={tenantOption.value} value={tenantOption.value}>
                {tenantOption.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="h-8 w-[160px] bg-slate-950 border-slate-600">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {workspaceBootstrap.projectOptions.map((projectOption) => (
              <SelectItem key={projectOption.value} value={projectOption.value}>
                {projectOption.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
          <SelectTrigger className="h-8 w-[104px] bg-slate-950 border-slate-600">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {workspaceBootstrap.environmentOptions.map((environmentOption) => (
              <SelectItem key={environmentOption.value} value={environmentOption.value}>
                {environmentOption.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex h-8 items-center gap-2 rounded-md border border-slate-600 bg-slate-950 px-2.5 text-xs">
              <GitBranch className="size-3.5 text-slate-300" />
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

        {/* Connection status — compact inline indicator, always visible when not ok */}
        {connectionStatus.rest === 'ok' ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-default px-1">
                <div className="size-1.5 rounded-full bg-green-500" />
                <Activity className="size-3.5" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>REST API: {connectionStatus.rest}</p>
              <p>Live Events: {connectionStatus.liveEvents}</p>
            </TooltipContent>
          </Tooltip>
        ) : connectionStatus.rest === 'offline' ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-default px-1 select-none">
                <WifiOff className="size-3.5" />
                <span>Offline</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{connectionDetail ?? 'Unable to reach /healthz'}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-[11px] text-amber-500 cursor-default px-1 select-none">
                <AlertTriangle className="size-3.5" />
                <span>Degraded</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{connectionDetail ?? 'Platform in degraded state'}</p>
            </TooltipContent>
          </Tooltip>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-slate-200 hover:text-white"
            >
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
