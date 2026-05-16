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
import { HexColorInput, HexColorPicker } from 'react-colorful';
import { CanvasViewMenuControls } from '../../views/canvas/CanvasViewMenuControls';
import { topAppBarClasses } from './chrome';
import type { ShellTopBarCopy } from './copy';
import {
  createCanvasPreviewStyle,
  normalizeCanvasPaletteId,
  type CanvasPaletteId,
} from '../../views/canvas/canvasPalette';

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
  readonly canvasPalette: CanvasPaletteId;
  readonly toggleExplorerPanel: () => void;
  readonly toggleInspectorPanel: () => void;
  readonly toggleConsolePanel: () => void;
  readonly toggleFocusMode: () => void;
  readonly setGridSize: (size: number) => void;
  readonly setCanvasPalette: (palette: CanvasPaletteId) => void;
  readonly copy: ShellTopBarCopy;
};

export function ShellMenu({
  explorerPanelVisible,
  inspectorPanelVisible,
  consolePanelVisible,
  focusMode,
  gridSize,
  canvasPalette,
  toggleExplorerPanel,
  toggleInspectorPanel,
  toggleConsolePanel,
  toggleFocusMode,
  setGridSize,
  setCanvasPalette,
  copy,
}: ShellMenuProps) {
  const resolvedCanvasPalette = normalizeCanvasPaletteId(canvasPalette);

  function handleCanvasPaletteChange(nextColor: string) {
    setCanvasPalette(normalizeCanvasPaletteId(nextColor));
  }

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
            <span
              aria-hidden="true"
              className="mr-2 h-4 w-6 shrink-0 rounded-[4px] border border-white/10"
              style={createCanvasPreviewStyle(resolvedCanvasPalette)}
            />
            {copy.canvasPalette}
            <span className="ml-auto mr-2 hidden font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:flex">
              {resolvedCanvasPalette}
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-72 p-3">
            <div className="space-y-3">
              <div className="overflow-hidden rounded-lg border border-white/10 bg-black/10">
                <div
                  aria-hidden="true"
                  className="h-20 border-b border-white/10"
                  style={createCanvasPreviewStyle(resolvedCanvasPalette)}
                />
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="text-xs font-medium tracking-wide text-muted-foreground">
                    {copy.canvasPalette}
                  </span>
                  <code className="rounded bg-black/25 px-2 py-1 text-[11px] font-medium text-foreground">
                    {resolvedCanvasPalette.toUpperCase()}
                  </code>
                </div>
              </div>
              <div className="canvas-background-color-picker rounded-lg border border-white/10 bg-black/10 p-3">
                <HexColorPicker
                  color={resolvedCanvasPalette}
                  onChange={handleCanvasPaletteChange}
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium tracking-wide text-muted-foreground">
                  Hex value
                </div>
                <HexColorInput
                  color={resolvedCanvasPalette}
                  prefixed
                  aria-label="Set canvas background hex color"
                  className="h-9 w-full rounded-md border border-white/10 bg-[var(--input-background)] px-3 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  onChange={handleCanvasPaletteChange}
                />
              </div>
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
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
        <CanvasViewMenuControls />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
