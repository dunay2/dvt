/** Owned concern: render primary Canvas toolbar controls without owning route command semantics. */
import { Download, FileCheck, Folder, Play, Upload } from 'lucide-react';
import { useMemo, useRef } from 'react';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Separator } from '../../components/ui/separator';
import { cn } from '../../components/ui/utils';
import type {
  CanvasGraphAuthoringMode,
  NodeKindRegistration,
} from '../../plugins/nodeTypeContracts';
import type { CanvasAuthoringNodeSeed } from './canvasAuthoringNodeCommand';
import { CanvasAddNodePalette } from './CanvasAddNodePalette';
import { canvasChromeClasses } from './canvasChromeTokens';
import { buildCanvasOutputTargetTemplateCatalog } from './canvasOutputTargetTemplateCatalog';
import { buildCanvasTransformationTemplateCatalog } from './canvasTransformationTemplateCatalog';
import { canvasViewCopy } from './copy';

type CanvasToolbarPrimaryControlsProps = {
  onExportProjectSnapshot: () => void;
  onImportProjectSnapshotFile: (file: File) => void;
  onPlan: () => void;
  onRun: () => void;
  onCreateAuthoringNode?: (
    registration: NodeKindRegistration,
    position?: { x: number; y: number },
    seed?: CanvasAuthoringNodeSeed
  ) => void;
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
  canvasAuthoringMode: CanvasGraphAuthoringMode;
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
  canvasAuthoringMode,
  authoringNodeKinds,
}: CanvasToolbarPrimaryControlsProps): JSX.Element {
  const importInputRef = useRef<HTMLInputElement>(null);
  const transformationTemplates = useMemo(
    () =>
      canvasAuthoringMode === 'transformation'
        ? buildCanvasTransformationTemplateCatalog(authoringNodeKinds)
        : [],
    [authoringNodeKinds, canvasAuthoringMode]
  );
  const outputTargetTemplates = useMemo(
    () =>
      canvasAuthoringMode === 'transformation'
        ? buildCanvasOutputTargetTemplateCatalog(authoringNodeKinds)
        : [],
    [authoringNodeKinds, canvasAuthoringMode]
  );

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
            transformationTemplates={transformationTemplates}
            outputTargetTemplates={outputTargetTemplates}
            triggerLabel={canvasViewCopy.toolbarInsertLabel}
            triggerDataSlot="canvas-toolbar-insert-command"
            disabled={!canEditEdges}
            align="right"
          />
          <Separator orientation="vertical" className={canvasChromeClasses.separator} />
        </>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            data-slot="canvas-toolbar-project-menu-trigger"
            variant="ghost"
            size="sm"
            className={canvasChromeClasses.ghostButton}
          >
            <Folder className="size-4" />
            {canvasViewCopy.toolbarProjectSnapshotMenuLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>{canvasViewCopy.toolbarProjectSnapshotMenuLabel}</DropdownMenuLabel>
          <DropdownMenuItem
            data-slot="canvas-toolbar-export-command"
            disabled={!canExportProjectSnapshot}
            onClick={onExportProjectSnapshot}
          >
            <Download className="mr-2 size-4" />
            {canvasViewCopy.toolbarExportSnapshotLabel}
          </DropdownMenuItem>
          <DropdownMenuItem
            data-slot="canvas-toolbar-import-command"
            disabled={!canImportProjectSnapshot}
            onClick={() => importInputRef.current?.click()}
          >
            <Upload className="mr-2 size-4" />
            {canvasViewCopy.toolbarImportSnapshotLabel}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
        className={canvasChromeClasses.primaryButton}
      >
        <Play className="mr-1.5 size-4" />
        {canvasViewCopy.toolbarRunLabel}
      </Button>
    </>
  );
}
