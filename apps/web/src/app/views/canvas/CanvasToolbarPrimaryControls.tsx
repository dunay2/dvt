/** Owned concern: render primary Canvas toolbar controls without owning route command semantics. */
import { Play } from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { cn } from '../../components/ui/utils';
import { canvasChromeClasses } from './canvasChromeTokens';
import { canvasViewCopy } from './copy';

type CanvasToolbarPrimaryControlsProps = {
  onRun: () => void;
  canRun: boolean;
  canStartRun: boolean;
  workflowStatusLabel: string;
  workflowStatusClass: string;
  workflowStatusTitle: string;
};

export function CanvasToolbarPrimaryControls({
  onRun,
  canRun,
  canStartRun,
  workflowStatusLabel,
  workflowStatusClass,
  workflowStatusTitle,
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
