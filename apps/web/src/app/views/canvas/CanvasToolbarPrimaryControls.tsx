/** Owned concern: render primary Canvas toolbar controls without owning route command semantics. */
import { FileCheck, Play } from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { cn } from '../../components/ui/utils';
import { canvasChromeClasses } from './canvasChromeTokens';
import { canvasViewCopy } from './copy';

type CanvasToolbarPrimaryControlsProps = {
  onPlan: () => void;
  onRun: () => void;
  canPlan: boolean;
  canRun: boolean;
  canStartRun: boolean;
  workflowStatusLabel: string;
  workflowStatusClass: string;
  workflowStatusTitle: string;
  canPlanGraph: boolean;
};

export function CanvasToolbarPrimaryControls({
  onPlan,
  onRun,
  canPlan,
  canRun,
  canStartRun,
  workflowStatusLabel,
  workflowStatusClass,
  workflowStatusTitle,
  canPlanGraph,
}: CanvasToolbarPrimaryControlsProps): JSX.Element {
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
