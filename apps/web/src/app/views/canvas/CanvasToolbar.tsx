import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Columns, DollarSign, FileCheck, LayoutGrid, Play, Target } from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { cn } from '../../components/ui/utils';
import type { TransformationGraphValidationResult } from './transformationGraphValidation';

type CanvasToolbarProps = {
  readonly placement?: 'inline' | 'top-bar';
  readonly onAutoLayout: () => void;
  readonly onToggleCostOverlay: () => void;
  readonly onToggleImpact: () => void;
  readonly onToggleColumns: () => void;
  readonly onPlan: () => void;
  readonly onRun: () => void;
  readonly canPlan: boolean;
  readonly canRun: boolean;
  readonly canEditEdges: boolean;
  readonly canStartRun: boolean;
  readonly planStatusSummary: string;
  readonly canvasAuthoringMode: 'transformation' | 'dbt';
  readonly exclusiveOverlayMode: 'runtime' | 'cost';
  readonly canUseCostOverlay: boolean;
  readonly impactOverlayEnabled: boolean;
  readonly columnLevelLineageEnabled: boolean;
  readonly transformationValidation: TransformationGraphValidationResult;
  readonly nodeCount: number;
  readonly edgeCount: number;
};

function resolveModeLabel(canvasAuthoringMode: 'transformation' | 'dbt'): string {
  return canvasAuthoringMode === 'transformation' ? 'SQL flow' : 'dbt graph';
}

function resolveValidationLabel(
  transformationValidation: TransformationGraphValidationResult
): string {
  if (transformationValidation.valid) {
    return 'Preview ready';
  }

  if (
    transformationValidation.summary ===
    'Plan requires exactly 3 nodes: source, sql_transform, and sink.'
  ) {
    return 'Need source, transform, sink';
  }

  return transformationValidation.summary;
}

function resolvePlanLabel(planStatusSummary: string, canStartRun: boolean): string {
  if (canStartRun) {
    return 'Run ready';
  }

  if (planStatusSummary === 'Preview required before running.') {
    return 'Plan required';
  }

  return planStatusSummary;
}

export default function CanvasToolbar({
  placement = 'inline',
  onAutoLayout,
  onToggleCostOverlay,
  onToggleImpact,
  onToggleColumns,
  onPlan,
  onRun,
  canPlan,
  canRun,
  canEditEdges,
  canStartRun,
  planStatusSummary,
  canvasAuthoringMode,
  exclusiveOverlayMode,
  canUseCostOverlay,
  impactOverlayEnabled,
  columnLevelLineageEnabled,
  transformationValidation,
  nodeCount,
  edgeCount,
}: CanvasToolbarProps) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (placement !== 'top-bar' || typeof document === 'undefined') {
      setPortalTarget(null);
      return;
    }

    setPortalTarget(document.getElementById('shell-top-bar-canvas-controls'));
  }, [placement]);

  const canPlanTransformation = transformationValidation.valid;
  const modeLabel = resolveModeLabel(canvasAuthoringMode);
  const validationLabel = resolveValidationLabel(transformationValidation);
  const planLabel = resolvePlanLabel(planStatusSummary, canStartRun);
  const graphStatsLabel = `${nodeCount}N / ${edgeCount}E`;

  const content = (
    <div className="flex min-w-0 items-center gap-2">
        <div className="hidden items-center gap-1.5 xl:flex">
          <Badge
            variant="outline"
            className="h-7 border-slate-700 bg-slate-950/60 px-2 text-[11px] font-medium text-cyan-200"
            title={
              canvasAuthoringMode === 'transformation'
                ? 'Mode: source -> sql_transform -> sink'
                : 'Mode: dbt graph'
            }
          >
            {modeLabel}
          </Badge>
          <Badge
            variant="outline"
            className="h-7 border-slate-700 bg-slate-950/60 px-2 text-[11px] font-medium text-slate-200"
            title={`${nodeCount} node${nodeCount !== 1 ? 's' : ''} and ${edgeCount} edge${
              edgeCount !== 1 ? 's' : ''
            }`}
          >
            {graphStatsLabel}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              'h-7 border-slate-700 bg-slate-950/60 px-2 text-[11px] font-medium',
              canPlanTransformation ? 'text-emerald-200' : 'text-amber-200'
            )}
            title={transformationValidation.summary}
          >
            {validationLabel}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              'h-7 max-w-[15rem] border-slate-700 bg-slate-950/60 px-2 text-[11px] font-medium',
              canStartRun ? 'text-emerald-200' : 'text-slate-200'
            )}
            title={planStatusSummary}
          >
            <span className="truncate">{planLabel}</span>
          </Badge>
          <Separator orientation="vertical" className="h-5 bg-slate-700" />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAutoLayout}
          disabled={!canEditEdges}
          className="h-8 gap-1.5 px-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <LayoutGrid className="size-4" />
          Layout
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
          Impact
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
          Columns
        </Button>

        {canUseCostOverlay && (
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
            Cost
          </Button>
        )}
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
          Plan
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
          Run
        </Button>
      </div>
  );

  if (placement === 'top-bar') {
    return portalTarget ? createPortal(content, portalTarget) : null;
  }

  return (
    <div className="flex h-10 shrink-0 items-center justify-end gap-3 border-b border-slate-700 bg-slate-900 px-3">
      {content}
    </div>
  );
}
