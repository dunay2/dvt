import {
  Grid2X2,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelRightClose,
  SlidersHorizontal,
  TerminalSquare,
} from 'lucide-react';
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
import type { ShellTopBarCopy } from './copy';

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
  readonly copy: ShellTopBarCopy;
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
          <SlidersHorizontal className="size-4" />
          {copy.shell}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{copy.workspacePanels}</DropdownMenuLabel>
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
            <Grid2X2 className="mr-2 size-4" />
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
        <DropdownMenuLabel>{copy.viewOptions}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setGridSize(20)}>{copy.resetGrid}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
