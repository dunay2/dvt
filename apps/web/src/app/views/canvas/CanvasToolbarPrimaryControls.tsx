import {
  Columns,
  DollarSign,
  FileCheck,
  Grid3X3,
  LayoutGrid,
  Magnet,
  Play,
  Target,
} from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { cn } from '../../components/ui/utils';
import type { CanvasPaletteId } from './canvasPalette';
import { canvasViewCopy } from './copy';

type CanvasToolbarPrimaryControlsProps = {
  onAutoLayout: () => void;
  onToggleCostOverlay: () => void;
  onToggleImpact: () => void;
  onToggleColumns: () => void;
  onToggleGridVisible: () => void;
  onGridColorChange: (color: CanvasPaletteId) => void;
  onToggleSnapToGrid: () => void;
  onPlan: () => void;
  onRun: () => void;
  canPlan: boolean;
  canRun: boolean;
  canEditEdges: boolean;
  canStartRun: boolean;
  exclusiveOverlayMode: 'runtime' | 'cost';
  canUseCostOverlay: boolean;
  impactOverlayEnabled: boolean;
  columnLevelLineageEnabled: boolean;
  canvasGridVisible: boolean;
  canvasGridColor: CanvasPaletteId;
  canvasSnapToGrid: boolean;
  workflowStatusLabel: string;
  workflowStatusClass: string;
  workflowStatusTitle: string;
  canPlanTransformation: boolean;
};

export function CanvasToolbarPrimaryControls({
  onAutoLayout,
  onToggleCostOverlay,
  onToggleImpact,
  onToggleColumns,
  onToggleGridVisible,
  onGridColorChange,
  onToggleSnapToGrid,
  onPlan,
  onRun,
  canPlan,
  canRun,
  canEditEdges,
  canStartRun,
  exclusiveOverlayMode,
  canUseCostOverlay,
  impactOverlayEnabled,
  columnLevelLineageEnabled,
  canvasGridVisible,
  canvasGridColor,
  canvasSnapToGrid,
  workflowStatusLabel,
  workflowStatusClass,
  workflowStatusTitle,
  canPlanTransformation,
}: CanvasToolbarPrimaryControlsProps): JSX.Element {
  return (
    <>
      <Badge
        data-slot="canvas-workflow-status"
        variant="outline"
        className={cn(
          'h-7 border-slate-700 bg-slate-950/60 px-2 text-[11px] font-medium',
          workflowStatusClass
        )}
        title={workflowStatusTitle}
      >
        {workflowStatusLabel}
      </Badge>
      <Separator orientation="vertical" className="h-5 bg-slate-700" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onAutoLayout}
        disabled={!canEditEdges}
        className="h-8 gap-1.5 px-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
      >
        <LayoutGrid className="size-4" />
        {canvasViewCopy.toolbarLayoutLabel}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggleImpact}
        className={cn(
          'h-8 gap-1.5 px-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-white',
          impactOverlayEnabled && 'bg-slate-700 text-white'
        )}
      >
        <Target className="size-4" />
        {canvasViewCopy.toolbarImpactLabel}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggleColumns}
        className={cn(
          'h-8 gap-1.5 px-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-white',
          columnLevelLineageEnabled && 'bg-slate-700 text-white'
        )}
      >
        <Columns className="size-4" />
        {canvasViewCopy.toolbarColumnsLabel}
      </Button>

      {canUseCostOverlay ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleCostOverlay}
          className={cn(
            'h-8 gap-1.5 px-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-white',
            exclusiveOverlayMode === 'cost' && 'bg-slate-700 text-white'
          )}
        >
          <DollarSign className="size-4" />
          {canvasViewCopy.toolbarCostLabel}
        </Button>
      ) : null}
      <Separator orientation="vertical" className="h-5 bg-slate-700" />

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggleGridVisible}
        aria-label={canvasViewCopy.toolbarGridLabel}
        title={canvasViewCopy.toolbarGridLabel}
        className={cn(
          'h-8 gap-1.5 px-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-white',
          canvasGridVisible && 'bg-slate-700 text-white'
        )}
      >
        <Grid3X3 className="size-4" />
        {canvasViewCopy.toolbarGridLabel}
      </Button>

      <label
        className="flex h-8 items-center gap-2 rounded-md border border-slate-700 bg-slate-950/40 px-2 text-xs text-slate-300"
        title={canvasViewCopy.toolbarGridColorLabel}
      >
        <span>{canvasViewCopy.toolbarGridColorLabel}</span>
        <input
          type="color"
          value={canvasGridColor}
          aria-label={canvasViewCopy.toolbarGridColorLabel}
          onInput={(event) => onGridColorChange(event.currentTarget.value as CanvasPaletteId)}
          className="size-5 cursor-pointer rounded border border-slate-600 bg-transparent p-0"
        />
      </label>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggleSnapToGrid}
        aria-label={canvasViewCopy.toolbarSnapToGridLabel}
        title={canvasViewCopy.toolbarSnapToGridLabel}
        className={cn(
          'h-8 gap-1.5 px-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-white',
          canvasSnapToGrid && 'bg-slate-700 text-white'
        )}
      >
        <Magnet className="size-4" />
        {canvasViewCopy.toolbarSnapToGridLabel}
      </Button>

      <Separator orientation="vertical" className="h-5 bg-slate-700" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onPlan}
        disabled={!canPlan || !canPlanTransformation}
        className="h-8 border-slate-600 bg-transparent px-3 text-xs text-slate-200 hover:bg-slate-800 hover:text-white"
      >
        <FileCheck className="mr-1.5 size-4" />
        {canvasViewCopy.toolbarPlanLabel}
      </Button>
      <Button
        type="button"
        variant="default"
        size="sm"
        onClick={onRun}
        disabled={!canRun || !canStartRun}
        className="h-8 px-3 text-xs"
      >
        <Play className="mr-1.5 size-4" />
        {canvasViewCopy.toolbarRunLabel}
      </Button>
    </>
  );
}
