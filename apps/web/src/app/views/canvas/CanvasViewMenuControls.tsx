/** Owned concern: render Canvas-specific visual controls inside the shell View menu. */
import { useEffect } from 'react';
import { Columns, DollarSign, Grid3X3, LayoutGrid, Magnet, Target } from 'lucide-react';

import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import type { CanvasPaletteId } from './canvasPalette';
import { canvasViewCopy } from './copy';
import type { CanvasViewMenuContribution } from './canvasViewMenuContributionStore';
import { useCanvasViewMenuContributionStore } from './canvasViewMenuContributionStore';

type CanvasViewMenuContributionRegistrarProps = CanvasViewMenuContribution;

export function CanvasViewMenuContributionRegistrar(
  contribution: CanvasViewMenuContributionRegistrarProps
): null {
  const registerCanvasViewMenuContribution = useCanvasViewMenuContributionStore(
    (state) => state.registerCanvasViewMenuContribution
  );
  const clearCanvasViewMenuContribution = useCanvasViewMenuContributionStore(
    (state) => state.clearCanvasViewMenuContribution
  );

  useEffect(() => {
    registerCanvasViewMenuContribution(contribution);
    return () => {
      clearCanvasViewMenuContribution(contribution);
    };
  }, [clearCanvasViewMenuContribution, contribution, registerCanvasViewMenuContribution]);

  return null;
}

export function CanvasViewMenuControls(): JSX.Element | null {
  const contribution = useCanvasViewMenuContributionStore((state) => state.contribution);

  if (contribution == null) {
    return null;
  }

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Canvas</DropdownMenuLabel>
      <DropdownMenuItem disabled={!contribution.canEditEdges} onClick={contribution.onAutoLayout}>
        <LayoutGrid className="mr-2 size-4" />
        {canvasViewCopy.toolbarLayoutLabel}
      </DropdownMenuItem>
      <DropdownMenuCheckboxItem
        checked={contribution.impactOverlayEnabled}
        onCheckedChange={contribution.onToggleImpact}
      >
        <Target className="mr-2 size-4" />
        {canvasViewCopy.toolbarImpactLabel}
      </DropdownMenuCheckboxItem>
      <DropdownMenuCheckboxItem
        checked={contribution.columnLevelLineageEnabled}
        onCheckedChange={contribution.onToggleColumns}
      >
        <Columns className="mr-2 size-4" />
        {canvasViewCopy.toolbarColumnsLabel}
      </DropdownMenuCheckboxItem>
      {contribution.canUseCostOverlay ? (
        <DropdownMenuCheckboxItem
          checked={contribution.exclusiveOverlayMode === 'cost'}
          onCheckedChange={contribution.onToggleCostOverlay}
        >
          <DollarSign className="mr-2 size-4" />
          {canvasViewCopy.toolbarCostLabel}
        </DropdownMenuCheckboxItem>
      ) : null}
      <DropdownMenuCheckboxItem
        checked={contribution.canvasGridVisible}
        onCheckedChange={contribution.onToggleGridVisible}
      >
        <Grid3X3 className="mr-2 size-4" />
        {canvasViewCopy.toolbarGridLabel}
      </DropdownMenuCheckboxItem>
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault();
        }}
      >
        <span>{canvasViewCopy.toolbarGridColorLabel}</span>
        <input
          type="color"
          value={contribution.canvasGridColor}
          aria-label={canvasViewCopy.toolbarGridColorLabel}
          onInput={(event) =>
            contribution.onGridColorChange(event.currentTarget.value as CanvasPaletteId)
          }
          className="ml-auto size-5 cursor-pointer rounded border border-white/10 bg-transparent p-0"
        />
      </DropdownMenuItem>
      <DropdownMenuCheckboxItem
        checked={contribution.canvasSnapToGrid}
        onCheckedChange={contribution.onToggleSnapToGrid}
      >
        <Magnet className="mr-2 size-4" />
        {canvasViewCopy.toolbarSnapToGridLabel}
      </DropdownMenuCheckboxItem>
    </>
  );
}
