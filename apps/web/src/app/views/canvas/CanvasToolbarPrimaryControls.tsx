/** Owned concern: render primary Canvas toolbar controls without owning route command semantics. */
import { Download, FileCheck, Play, Upload } from 'lucide-react';
import { useRef } from 'react';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { cn } from '../../components/ui/utils';
import { canvasViewCopy } from './copy';

type CanvasToolbarPrimaryControlsProps = {
  onExportProjectSnapshot: () => void;
  onImportProjectSnapshotFile: (file: File) => void;
  onPlan: () => void;
  onRun: () => void;
  canPlan: boolean;
  canRun: boolean;
  canExportProjectSnapshot: boolean;
  canImportProjectSnapshot: boolean;
  canStartRun: boolean;
  workflowStatusLabel: string;
  workflowStatusClass: string;
  workflowStatusTitle: string;
  canPlanTransformation: boolean;
};

export function CanvasToolbarPrimaryControls({
  onExportProjectSnapshot,
  onImportProjectSnapshotFile,
  onPlan,
  onRun,
  canPlan,
  canRun,
  canExportProjectSnapshot,
  canImportProjectSnapshot,
  canStartRun,
  workflowStatusLabel,
  workflowStatusClass,
  workflowStatusTitle,
  canPlanTransformation,
}: CanvasToolbarPrimaryControlsProps): JSX.Element {
  const importInputRef = useRef<HTMLInputElement>(null);

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
        onClick={onExportProjectSnapshot}
        disabled={!canExportProjectSnapshot}
        className="h-8 gap-1.5 px-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
      >
        <Download className="size-4" />
        {canvasViewCopy.toolbarExportSnapshotLabel}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => importInputRef.current?.click()}
        disabled={!canImportProjectSnapshot}
        className="h-8 gap-1.5 px-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
      >
        <Upload className="size-4" />
        {canvasViewCopy.toolbarImportSnapshotLabel}
      </Button>
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label={canvasViewCopy.toolbarImportSnapshotLabel}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file != null) {
            onImportProjectSnapshotFile(file);
          }
        }}
      />

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
