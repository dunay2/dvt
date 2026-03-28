import { ArrowLeft, ChevronDown, Columns, FileCheck, GitBranch, Play, Target } from 'lucide-react';
import { useNavigate } from 'react-router';

import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Separator } from '../../components/ui/separator';
import { cn } from '../../components/ui/utils';

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
  readonly nodeCount: number;
  readonly edgeCount: number;
};

export default function CanvasToolbar({
  onAutoLayout,
  onToggleImpact,
  onToggleColumns,
  onPlan,
  onRun,
  impactOverlayEnabled,
  columnLevelLineageEnabled,
  nodeCount,
  edgeCount,
}: CanvasToolbarProps) {
  const navigate = useNavigate();

  return (
    <div className="h-10 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-3 gap-3">
      {/* Left — Edit menu + visible toggles */}
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-slate-200 hover:text-white gap-1"
            >
              Edit
              <ChevronDown className="size-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem className="gap-2" onSelect={onAutoLayout}>
              <GitBranch className="size-4 shrink-0" />
              Auto Layout
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2"
              onSelect={() => {
                void navigate(-1);
              }}
            >
              <ArrowLeft className="size-4 shrink-0" />
              Back
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Visible toggles — state immediately visible */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleImpact}
          className={cn(
            'gap-1.5 text-slate-300 hover:text-white',
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
            'gap-1.5 text-slate-300 hover:text-white',
            columnLevelLineageEnabled && 'bg-slate-700 text-white'
          )}
        >
          <Columns className="size-4" />
          Columns
        </Button>
      </div>

      {/* Centre — canvas stats */}
      <div className="flex items-center gap-3 text-[11px] text-slate-500 select-none tabular-nums">
        <span>
          {nodeCount} node{nodeCount !== 1 ? 's' : ''}
        </span>
        <span>
          {edgeCount} edge{edgeCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Right — execution */}
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onPlan}>
          <FileCheck className="size-4 mr-1.5" />
          Plan
        </Button>
        <Button type="button" variant="default" size="sm" onClick={onRun}>
          <Play className="size-4 mr-1.5" />
          Run
        </Button>
      </div>
    </div>
  );
}
