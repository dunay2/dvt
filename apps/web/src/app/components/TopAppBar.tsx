import {
  Search,
  Bell,
  User,
  GitBranch,
  Database,
  Activity,
  Maximize2,
  Minimize2,
  Menu,
  Eye,
  EyeOff,
  PanelLeftClose,
  PanelRightClose,
  TerminalSquare,
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from './ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

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
      return 'REST OK / Live';
    } else if (connectionStatus.rest === 'ok' && connectionStatus.liveEvents === 'polling') {
      return 'REST OK / Polling';
    } else if (connectionStatus.rest === 'degraded') {
      return 'Degraded';
    } else {
      return 'Offline';
    }
  };

  return (
    <div className="h-14 bg-[#0f1116] border-b border-gray-800 flex items-center px-4 gap-4 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <Database className="size-6 text-blue-400" />
        <span className="font-semibold text-lg">DVT+</span>
      </div>

      {/* View Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <Menu className="size-4 mr-2" />
            View
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Panels</DropdownMenuLabel>
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
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Canvas Grid Size</DropdownMenuLabel>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Grid: {gridSize}px</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setGridSize(10)}>10px (Dense)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGridSize(15)}>15px</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGridSize(20)}>20px (Default)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGridSize(30)}>30px</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGridSize(40)}>40px (Sparse)</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem checked={focusMode} onCheckedChange={toggleFocusMode}>
            <Maximize2 className="size-4 mr-2" />
            Focus Mode
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Tenant Switcher */}
      <Select value={selectedTenant} onValueChange={setSelectedTenant}>
        <SelectTrigger className="w-[140px] bg-[#1a1d23] border-gray-700">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="acme-corp">ACME Corp</SelectItem>
          <SelectItem value="globex">Globex Inc</SelectItem>
          <SelectItem value="initech">Initech</SelectItem>
        </SelectContent>
      </Select>

      {/* Project Selector */}
      <Select value={selectedProject} onValueChange={setSelectedProject}>
        <SelectTrigger className="w-[160px] bg-[#1a1d23] border-gray-700">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="dbt-analytics">dbt-analytics</SelectItem>
          <SelectItem value="dbt-marketing">dbt-marketing</SelectItem>
          <SelectItem value="dbt-finance">dbt-finance</SelectItem>
        </SelectContent>
      </Select>

      {/* Environment Selector */}
      <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
        <SelectTrigger className="w-[120px] bg-[#1a1d23] border-gray-700">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="dev">dev</SelectItem>
          <SelectItem value="stage">stage</SelectItem>
          <SelectItem value="prod">prod</SelectItem>
        </SelectContent>
      </Select>

      {/* Git Info */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1d23] border border-gray-700 rounded-md text-sm">
              <GitBranch className="size-4 text-gray-400" />
              <span>{gitBranch}</span>
              <span className="text-gray-500">@</span>
              <code className="text-xs text-gray-400">{gitSha}</code>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Current Git branch and commit SHA</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Global Search */}
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <Input
          placeholder="Search models, tests, sources..."
          className="pl-10 bg-[#1a1d23] border-gray-700"
        />
      </div>

      {/* Connection Status */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1d23] border border-gray-700 rounded-md text-sm cursor-pointer hover:bg-[#22252b]">
              <div className={`size-2 rounded-full ${getStatusColor()}`} />
              <Activity className="size-4 text-gray-400" />
              <span className="text-xs">{getStatusLabel()}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>REST API: {connectionStatus.rest}</p>
            <p>Live Events: {connectionStatus.liveEvents}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Focus Mode Toggle */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFocusMode}
              className="text-gray-400 hover:text-white"
            >
              {focusMode ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Notifications */}
      <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white relative">
        <Bell className="size-5" />
        <Badge className="absolute -top-1 -right-1 size-4 p-0 flex items-center justify-center bg-red-500 text-[10px]">
          3
        </Badge>
      </Button>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
            <User className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>john.doe@company.com</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profile Settings</DropdownMenuItem>
          <DropdownMenuItem>API Keys</DropdownMenuItem>
          <DropdownMenuItem>Documentation</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Sign Out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
