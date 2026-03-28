import {
  ArrowLeft,
  ChevronDown,
  Columns,
  FileCheck,
  GitBranch,
  Play,
  Target,
} from 'lucide-react';
import { useNavigate } from 'react-router';

import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';

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
  onToggleImpact,
  onToggleColumns,
  onPlan,
  onRun,
  impactOverlayEnabled,
  columnLevelLineageEnabled,
}: CanvasToolbarProps) {
  const navigate = useNavigate();

  return (
    <div className="h-10 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              Edit
              <ChevronDown className="ml-1 size-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="w-52 bg-slate-900 border-slate-700 text-slate-50"
          >
            <DropdownMenuItem
              className="gap-2 focus:bg-slate-800 focus:text-white"
              onSelect={onAutoLayout}
            >
              <GitBranch className="size-4 shrink-0" />
              Auto Layout
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-slate-700" />

            <DropdownMenuItem
              className="gap-2 focus:bg-slate-800 focus:text-white"
              onSelect={onToggleImpact}
            >
              <Target className="size-4 shrink-0" />
              <span className="flex-1">Impact Overlay</span>
              {impactOverlayEnabled && (
                <span className="text-[10px] font-mono text-blue-400">on</span>
              )}
            </DropdownMenuItem>

            <DropdownMenuItem
              className="gap-2 focus:bg-slate-800 focus:text-white"
              onSelect={onToggleColumns}
            >
              <Columns className="size-4 shrink-0" />
              <span className="flex-1">Column Lineage</span>
              {columnLevelLineageEnabled && (
                <span className="text-[10px] font-mono text-blue-400">on</span>
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-slate-700" />

            <DropdownMenuItem
              className="gap-2 focus:bg-slate-800 focus:text-white"
              onSelect={() => navigate(-1)}
            >
              <ArrowLeft className="size-4 shrink-0" />
              Back
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2">
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
