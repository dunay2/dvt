/** Owned concern: render primary Canvas toolbar controls without owning route command semantics. */
import { Download, FileCheck, Play, Upload } from 'lucide-react';
import { useRef } from 'react';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { cn } from '../../components/ui/utils';
import type { NodeKindRegistration } from '../../plugins/nodeTypeContracts';
import { CanvasAddNodePalette } from './CanvasAddNodePalette';
import { canvasChromeClasses } from './canvasChromeTokens';
import { canvasViewCopy } from './copy';

type CanvasToolbarPrimaryControlsProps = {
  onExportProjectSnapshot: () => void;
  onImportProjectSnapshotFile: (file: File) => void;
  onPlan: () => void;
  onRun: () => void;
  onCreateAuthoringNode?: (registration: NodeKindRegistration) => void;
  canPlan: boolean;
  canRun: boolean;
  canEditEdges: boolean;
  canExportProjectSnapshot: boolean;
  canImportProjectSnapshot: boolean;
  canStartRun: boolean;
  workflowStatusLabel: string;
  workflowStatusClass: string;
  workflowStatusTitle: string;
  canPlanGraph: boolean;
  authoringNodeKinds: readonly NodeKindRegistration[];
};

export function CanvasToolbarPrimaryControls({
  onExportProjectSnapshot,
  onImportProjectSnapshotFile,
  onPlan,
  onRun,
  onCreateAuthoringNode,
  canPlan,
  canRun,
  canEditEdges,
  canExportProjectSnapshot,
  canImportProjectSnapshot,
  canStartRun,
  workflowStatusLabel,
  workflowStatusClass,
  workflowStatusTitle,
  canPlanGraph,
  authoringNodeKinds,
}: CanvasToolbarPrimaryControlsProps): JSX.Element {
  const importInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Badge
        data-slot="canvas-workflow-status"
        variant="outline"
        className={cn(canvasChromeClasses.statusBadge, workflowStatusClass)}
        title={workflowStatusTitle}
      >
        {workflowStatusLabel}
      </Badge>
      <Separator orientation="vertical" className={canvasChromeClasses.separator} />

      {onCreateAuthoringNode != null && authoringNodeKinds.length > 0 ? (
        <>
          <CanvasAddNodePalette
            nodeKinds={authoringNodeKinds}
            onCreateAuthoringNode={onCreateAuthoringNode}
            triggerLabel={canvasViewCopy.toolbarInsertLabel}
            triggerDataSlot="canvas-toolbar-insert-command"
            disabled={!canEditEdges}
            align="right"
          />
          <Separator orientation="vertical" className={canvasChromeClasses.separator} />
        </>
      ) : null}

      <Button
        type="button"
        data-slot="canvas-toolbar-export-command"
        variant="ghost"
        size="sm"
        onClick={onExportProjectSnapshot}
        disabled={!canExportProjectSnapshot}
        className={canvasChromeClasses.ghostButton}
      >
        <Download className="size-4" />
        {canvasViewCopy.toolbarExportSnapshotLabel}
      </Button>
      <Button
        type="button"
        data-slot="canvas-toolbar-import-command"
        variant="ghost"
        size="sm"
        onClick={() => importInputRef.current?.click()}
        disabled={!canImportProjectSnapshot}
        className={canvasChromeClasses.ghostButton}
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

      <Separator orientation="vertical" className={canvasChromeClasses.separator} />
      <Button
        type="button"
        data-slot="canvas-toolbar-plan-command"
        variant="outline"
        size="sm"
        onClick={onPlan}
        disabled={!canPlan || !canPlanGraph}
        className={canvasChromeClasses.outlineButton}
      >
        <FileCheck className="mr-1.5 size-4" />
        {canvasViewCopy.toolbarPlanLabel}
      </Button>
      <Button
        type="button"
        data-slot="canvas-toolbar-run-command"
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
