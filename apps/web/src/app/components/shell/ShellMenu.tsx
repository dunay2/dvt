/** Owned concern: render top-bar workspace navigation and view-control menus without owning route behavior. */
import {
  Activity,
  BriefcaseBusiness,
  Grid2X2,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
} from 'lucide-react';
import { HexColorInput, HexColorPicker } from 'react-colorful';
import { NavLink } from 'react-router';
import type { ProjectIdentityBadge } from '../../shell/projectIdentityBadge';
import type { ShellNavigationModel } from '../../shell/shellNavigationModel';
import {
  createCanvasPreviewStyle,
  normalizeCanvasPaletteId,
  type CanvasPaletteId,
} from '../../views/canvas/canvasPalette';
import { CanvasViewMenuControls } from '../../views/canvas/CanvasViewMenuControls';
import { CanvasWorkspaceMenuControls } from '../../views/canvas/CanvasWorkspaceMenuControls';
import { Button } from '../ui/button';
import type { ShellViewControlsReadModel } from './shellViewControlsModel';
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
import { ShellWorkspaceContextDetails } from './ShellWorkspaceContextDetails';

const GRID_OPTIONS = [
  { value: 10, label: '10px (Dense)' },
  { value: 15, label: '15px' },
  { value: 20, label: '20px (Default)' },
  { value: 30, label: '30px' },
  { value: 40, label: '40px (Sparse)' },
];

type ShellMenuProps = {
  readonly kind: 'workspace' | 'view';
  readonly viewControls: ShellViewControlsReadModel;
  readonly bottomDrawerVisible: boolean;
  readonly focusMode: boolean;
  readonly gridSize: number;
  readonly canvasPalette: CanvasPaletteId;
  readonly navigationModel: ShellNavigationModel;
  readonly projectIdentityBadge: ProjectIdentityBadge;
  readonly gitBranch: string;
  readonly gitSha: string;
  readonly toggleBottomDrawer: () => void;
  readonly toggleFocusMode: () => void;
  readonly setGridSize: (size: number) => void;
  readonly setCanvasPalette: (palette: CanvasPaletteId) => void;
  readonly copy: ShellTopBarCopy;
};

export function ShellMenu({
  kind,
  viewControls,
  bottomDrawerVisible,
  focusMode,
  gridSize,
  canvasPalette,
  navigationModel,
  projectIdentityBadge,
  gitBranch,
  gitSha,
  toggleBottomDrawer,
  toggleFocusMode,
  setGridSize,
  setCanvasPalette,
  copy,
}: ShellMenuProps) {
  const resolvedCanvasPalette = normalizeCanvasPaletteId(canvasPalette);
  const isWorkspaceMenu = kind === 'workspace';

  function handleCanvasPaletteChange(nextColor: string) {
    setCanvasPalette(normalizeCanvasPaletteId(nextColor));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          data-slot={isWorkspaceMenu ? 'shell-workspace-menu-trigger' : 'shell-menu-trigger'}
          variant="ghost"
          size="sm"
          className={topAppBarClasses.menuButton}
        >
          {isWorkspaceMenu ? (
            <BriefcaseBusiness className="size-4" />
          ) : (
            <SlidersHorizontal className="size-4" />
          )}
          {isWorkspaceMenu ? copy.workspaceMenu : copy.shell}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {isWorkspaceMenu ? (
          <>
            <DropdownMenuLabel>{copy.globalNavigation}</DropdownMenuLabel>
            {[...navigationModel.primaryItems, ...navigationModel.footerItems].map((item) => {
              const Icon = item.icon;
              return (
                <DropdownMenuItem key={item.to} asChild>
                  <NavLink data-slot="shell-menu-navigation-link" to={item.to}>
                    <Icon className="mr-2 size-4" />
                    {item.label}
                  </NavLink>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{copy.workspaceContext}</DropdownMenuLabel>
            <div data-slot="shell-menu-workspace-context" className="px-2 py-1.5">
              <ShellWorkspaceContextDetails badge={projectIdentityBadge} copy={copy} />
            </div>
            <DropdownMenuLabel>{copy.gitContext}</DropdownMenuLabel>
            <div
              data-slot="shell-menu-git-context"
              className="px-2 pb-2 text-xs text-(--text-subtle)"
            >
              <span>{gitBranch}</span>
              <span className="px-1">@</span>
              <code className="text-(--text-default)">{gitSha}</code>
            </div>
            <CanvasWorkspaceMenuControls />
          </>
        ) : (
          <>
            <DropdownMenuLabel>{copy.workspacePanels}</DropdownMenuLabel>
            {viewControls.showBottomDrawerToggle ? (
              <DropdownMenuCheckboxItem
                checked={bottomDrawerVisible}
                onCheckedChange={toggleBottomDrawer}
              >
                <Activity className="mr-2 size-4" />
                {copy.operationalDrawer}
              </DropdownMenuCheckboxItem>
            ) : null}
            {viewControls.showFocusModeToggle ? (
              <DropdownMenuCheckboxItem checked={focusMode} onCheckedChange={toggleFocusMode}>
                {focusMode ? (
                  <Minimize2 className="mr-2 size-4" />
                ) : (
                  <Maximize2 className="mr-2 size-4" />
                )}
                {copy.focusMode}
              </DropdownMenuCheckboxItem>
            ) : null}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span
                  aria-hidden="true"
                  className="mr-2 h-4 w-6 shrink-0 rounded-lg border border-white/10"
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
                      className="h-9 w-full rounded-md border border-white/10 bg-input-background px-3 text-sm text-foreground outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
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
            {viewControls.showCanvasViewContributionControls ? <CanvasViewMenuControls /> : null}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
