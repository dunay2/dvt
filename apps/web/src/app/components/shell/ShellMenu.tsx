import {
  Bell,
  Maximize2,
  Menu,
  Minimize2,
  PanelLeftClose,
  PanelRightClose,
  TerminalSquare,
  User,
} from 'lucide-react';
import type { TopAppBarCopy } from '../topAppBar/copy';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
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
} from '../ui/dropdown-menu';
import { topAppBarClasses } from './chrome';

const GRID_OPTIONS = [
  { value: 10, label: '10px (Dense)' },
  { value: 15, label: '15px' },
  { value: 20, label: '20px (Default)' },
  { value: 30, label: '30px' },
  { value: 40, label: '40px (Sparse)' },
];

type ShellMenuProps = {
  readonly explorerPanelVisible: boolean;
  readonly inspectorPanelVisible: boolean;
  readonly consolePanelVisible: boolean;
  readonly focusMode: boolean;
  readonly gridSize: number;
  readonly toggleExplorerPanel: () => void;
  readonly toggleInspectorPanel: () => void;
  readonly toggleConsolePanel: () => void;
  readonly toggleFocusMode: () => void;
  readonly setGridSize: (size: number) => void;
  readonly copy: TopAppBarCopy;
};

export function ShellMenu({
  explorerPanelVisible,
  inspectorPanelVisible,
  consolePanelVisible,
  focusMode,
  gridSize,
  toggleExplorerPanel,
  toggleInspectorPanel,
  toggleConsolePanel,
  toggleFocusMode,
  setGridSize,
  copy,
}: ShellMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-slot="shell-menu-trigger"
          variant="ghost"
          size="sm"
          className={topAppBarClasses.menuButton}
        >
          <Menu className="size-4" />
          {copy.shell}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{copy.workspaceControls}</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={explorerPanelVisible}
          onCheckedChange={toggleExplorerPanel}
        >
          <PanelLeftClose className="mr-2 size-4" />
          {copy.explorerPanel}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={inspectorPanelVisible}
          onCheckedChange={toggleInspectorPanel}
        >
          <PanelRightClose className="mr-2 size-4" />
          {copy.inspectorPanel}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={consolePanelVisible}
          onCheckedChange={toggleConsolePanel}
        >
          <TerminalSquare className="mr-2 size-4" />
          {copy.consolePanel}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={focusMode} onCheckedChange={toggleFocusMode}>
          {focusMode ? (
            <Minimize2 className="mr-2 size-4" />
          ) : (
            <Maximize2 className="mr-2 size-4" />
          )}
          {copy.focusMode}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {copy.gridSize}: {gridSize}px
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {GRID_OPTIONS.map((option) => (
              <DropdownMenuItem key={option.value} onClick={() => setGridSize(option.value)}>
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>{copy.quickActions}</DropdownMenuLabel>
        <DropdownMenuItem>
          <Bell className="mr-2 size-4" />
          {copy.notifications}
          <Badge className="ml-auto flex size-4 items-center justify-center bg-[var(--status-danger)] p-0 text-[10px] text-[var(--text-strong)]">
            3
          </Badge>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>john.doe@company.com</DropdownMenuLabel>
        <DropdownMenuItem>
          <User className="mr-2 size-4" />
          {copy.profileSettings}
        </DropdownMenuItem>
        <DropdownMenuItem>{copy.apiKeys}</DropdownMenuItem>
        <DropdownMenuItem>{copy.documentation}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>{copy.signOut}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
