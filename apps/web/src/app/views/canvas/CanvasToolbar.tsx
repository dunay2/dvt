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
  'inline-flex items-center gap-1 rounded px-2.5 py-1 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-default outline-none select-none';

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
    <div className="h-10 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-2 gap-2 shrink-0">
      {/* Left — menu bar + overlay toggles */}
      <div className="flex items-center">
        {/* File menu */}
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

        {/* Edit menu */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger className={MENU_TRIGGER_CLASS}>
            Edit
            <ChevronDown className="size-3 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className={MENU_CONTENT_CLASS}>
            <DropdownMenuItem className={MENU_ITEM_CLASS} disabled>
              <Undo2 className="size-4 shrink-0" />
              Undo
              <DropdownMenuShortcut>⌘Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem className={MENU_ITEM_CLASS} disabled>
              <Redo2 className="size-4 shrink-0" />
              Redo
              <DropdownMenuShortcut>⌘⇧Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-600" />
            <DropdownMenuItem className={MENU_ITEM_CLASS} onSelect={onAutoLayout}>
              <GitBranch className="size-4 shrink-0" />
              Auto Layout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-5 mx-2 bg-slate-700" />

        {/* Overlay toggles — state immediately visible */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleImpact}
          className={cn(
            'gap-1.5 text-slate-300 hover:text-white hover:bg-slate-800',
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
            'gap-1.5 text-slate-300 hover:text-white hover:bg-slate-800',
            columnLevelLineageEnabled && 'bg-slate-700 text-white'
          )}
        >
          <Columns className="size-4" />
          Columns
        </Button>
      </div>

      {/* Centre — canvas stats */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 select-none tabular-nums">
        <span>{nodeCount} node{nodeCount !== 1 ? 's' : ''}</span>
        <span className="text-slate-700">·</span>
        <span>{edgeCount} edge{edgeCount !== 1 ? 's' : ''}</span>
      </div>

      {/* Right — execution */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPlan}
          className="border-slate-600 text-slate-200 hover:text-white hover:bg-slate-800 bg-transparent"
        >
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
