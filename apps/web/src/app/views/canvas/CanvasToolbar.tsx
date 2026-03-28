import {
  ArrowLeft,
  ChevronDown,
  Columns,
  FileCheck,
  GitBranch,
  Play,
  Redo2,
  Target,
  Undo2,
} from 'lucide-react';
import { useNavigate } from 'react-router';

import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
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

const MENU_TRIGGER_CLASS =
  'inline-flex h-7 items-center gap-1 rounded px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-default outline-none select-none';

const MENU_CONTENT_CLASS = 'w-48 bg-slate-800 border border-slate-600 shadow-xl';

const MENU_ITEM_CLASS =
  'gap-2 text-slate-200 focus:bg-slate-700 focus:text-white data-[disabled]:opacity-40 data-[disabled]:pointer-events-none';

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
    <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-slate-700 bg-slate-900 px-2">
      <div className="flex min-w-0 items-center">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger className={MENU_TRIGGER_CLASS}>
            File
            <ChevronDown className="size-3 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className={MENU_CONTENT_CLASS}>
            <DropdownMenuItem
              className={MENU_ITEM_CLASS}
              onSelect={() => {
                void navigate(-1);
              }}
            >
              <ArrowLeft className="size-4 shrink-0" />
              Back
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger className={MENU_TRIGGER_CLASS}>
            Edit
            <ChevronDown className="size-3 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className={MENU_CONTENT_CLASS}>
            <DropdownMenuItem className={MENU_ITEM_CLASS} disabled>
              <Undo2 className="size-4 shrink-0" />
              Undo
              <DropdownMenuShortcut>Cmd+Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem className={MENU_ITEM_CLASS} disabled>
              <Redo2 className="size-4 shrink-0" />
              Redo
              <DropdownMenuShortcut>Cmd+Shift+Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-600" />
            <DropdownMenuItem className={MENU_ITEM_CLASS} onSelect={onAutoLayout}>
              <GitBranch className="size-4 shrink-0" />
              Auto Layout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="mx-2 h-5 bg-slate-700" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleImpact}
          className={cn(
            'h-7 gap-1.5 px-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white',
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
            'h-7 gap-1.5 px-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white',
            columnLevelLineageEnabled && 'bg-slate-700 text-white'
          )}
        >
          <Columns className="size-4" />
          Columns
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 select-none tabular-nums">
          <span>
            {nodeCount} node{nodeCount !== 1 ? 's' : ''}
          </span>
          <span className="text-slate-700">�</span>
          <span>
            {edgeCount} edge{edgeCount !== 1 ? 's' : ''}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPlan}
          className="h-7 border-slate-600 bg-transparent px-2.5 text-xs text-slate-200 hover:bg-slate-800 hover:text-white"
        >
          <FileCheck className="mr-1.5 size-4" />
          Plan
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onRun}
          className="h-7 px-2.5 text-xs"
        >
          <Play className="mr-1.5 size-4" />
          Run
        </Button>
      </div>
    </div>
  );
}
