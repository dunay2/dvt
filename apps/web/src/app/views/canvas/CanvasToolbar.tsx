import { Columns, FileCheck, GitBranch, LayoutGrid, Play, Target, Upload } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { cn } from '../../components/ui/utils';

type CanvasToolbarProps = {
  readonly onOpenDataRegistry: () => void;
  readonly onAutoLayout: () => void;
  readonly onToggleCostOverlay: () => void;
  readonly onToggleImpact: () => void;
  readonly onToggleColumns: () => void;
  readonly onPlan: () => void;
  readonly onRun: () => void;
  readonly exclusiveOverlayMode: 'runtime' | 'cost';
  readonly canUseCostOverlay: boolean;
  readonly impactOverlayEnabled: boolean;
  readonly columnLevelLineageEnabled: boolean;
  readonly nodeCount: number;
  readonly edgeCount: number;
};

export default function CanvasToolbar({
  onOpenDataRegistry,
  onAutoLayout,
  onToggleCostOverlay,
  onToggleImpact,
  onToggleColumns,
  onPlan,
  onRun,
  exclusiveOverlayMode,
  canUseCostOverlay,
  impactOverlayEnabled,
  columnLevelLineageEnabled,
  nodeCount,
  edgeCount,
}: CanvasToolbarProps) {
  return (
    <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-slate-700 bg-slate-900 px-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="hidden text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500 lg:block">
          Graph Tools
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenDataRegistry}
          className="h-8 gap-1.5 border-slate-600 bg-slate-950/40 px-3 text-xs font-medium text-slate-100 hover:bg-slate-800 hover:text-white"
        >
          <Upload className="size-3.5" />
          Add data
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAutoLayout}
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
            <GitBranch className="size-4" />
            Cost
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 select-none tabular-nums">
          <span>
            {nodeCount} node{nodeCount !== 1 ? 's' : ''}
          </span>
          <span className="text-slate-700">·</span>
          <span>
            {edgeCount} edge{edgeCount !== 1 ? 's' : ''}
          </span>
        </div>
        <Separator orientation="vertical" className="h-5 bg-slate-700" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPlan}
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
          className="h-8 px-3 text-xs"
        >
          <Play className="mr-1.5 size-4" />
          Run
        </Button>
      </div>
    </div>
  );
}
