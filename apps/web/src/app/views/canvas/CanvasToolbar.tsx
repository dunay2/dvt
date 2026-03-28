import { Columns, DollarSign, FileCheck, GitBranch, Play, Target } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../components/ui/tooltip';

type CanvasToolbarProps = {
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
};

export default function CanvasToolbar({
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
}: CanvasToolbarProps) {
  return (
    <div className="h-10 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={onAutoLayout}>
                <GitBranch className="size-4 mr-2" />
                Auto Layout
              </Button>
            </TooltipTrigger>
            <TooltipContent>Apply dagre layout algorithm</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" className="h-6" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={exclusiveOverlayMode === 'cost' ? 'default' : 'ghost'}
                size="sm"
                onClick={onToggleCostOverlay}
                disabled={!canUseCostOverlay}
              >
                <DollarSign className="size-4 mr-2" />
                Cost
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {!canUseCostOverlay
                ? 'No node cost data available'
                : exclusiveOverlayMode === 'cost'
                  ? 'Switch back to runtime overlay'
                  : 'Switch to cost heatmap overlay'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={impactOverlayEnabled ? 'default' : 'ghost'}
                size="sm"
                onClick={onToggleImpact}
              >
                <Target className="size-4 mr-2" />
                Impact
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle impact overlay</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={columnLevelLineageEnabled ? 'default' : 'ghost'}
                size="sm"
                onClick={onToggleColumns}
              >
                <Columns className="size-4 mr-2" />
                Columns
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle column-level lineage</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center gap-2">
        <div className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-400">
          overlay: {exclusiveOverlayMode}
        </div>
        <Button variant="outline" size="sm" onClick={onPlan}>
          <FileCheck className="size-4 mr-2" />
          Plan
        </Button>
        <Button variant="default" size="sm" onClick={onRun}>
          <Play className="size-4 mr-2" />
          Run
        </Button>
      </div>
    </div>
  );
}
