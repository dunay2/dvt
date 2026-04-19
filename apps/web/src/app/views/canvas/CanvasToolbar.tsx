import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Columns, DollarSign, FileCheck, LayoutGrid, Play, Target } from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Separator } from '../../components/ui/separator';
import { cn } from '../../components/ui/utils';
import type { CanvasDraftToolbarState } from './canvasDraftPresentationState';
import {
  canvasViewCopy,
  formatTransformationGraphValidationSummary,
} from './copy';
import type { TransformationGraphValidationResult } from './transformationGraphValidation';

type CanvasToolbarProps = {
  readonly placement?: 'inline' | 'top-bar';
  readonly onAutoLayout: () => void;
  readonly onToggleCostOverlay: () => void;
  readonly onToggleImpact: () => void;
  readonly onToggleColumns: () => void;
  readonly onReloadLatestDraft: () => void;
  readonly onPlan: () => void;
  readonly onRun: () => void;
  readonly draftToolbarState: CanvasDraftToolbarState;
  readonly canPlan: boolean;
  readonly canRun: boolean;
  readonly canEditEdges: boolean;
  readonly canStartRun: boolean;
  readonly planStatusSummary: string;
  readonly canvasAuthoringMode: 'transformation' | 'dbt';
  readonly exclusiveOverlayMode: 'runtime' | 'cost';
  readonly canUseCostOverlay: boolean;
  readonly impactOverlayEnabled: boolean;
  readonly columnLevelLineageEnabled: boolean;
  readonly transformationValidation: TransformationGraphValidationResult;
  readonly nodeCount: number;
  readonly edgeCount: number;
};

function resolveWorkflowStatusLabel(
  isRecoveryActive: boolean,
  canPlan: boolean,
  canRun: boolean,
  canStartRun: boolean
): string {
  if (isRecoveryActive) {
    return canvasViewCopy.toolbarWorkflowRecoveryLabel;
  }

  if (!canPlan && !canRun) {
    return canvasViewCopy.toolbarWorkflowReadOnlyLabel;
  }

  if (canStartRun) {
    return canvasViewCopy.toolbarWorkflowRunReadyLabel;
  }

  return canvasViewCopy.toolbarWorkflowPlanRequiredLabel;
}

function resolveWorkflowStatusClass(
  isRecoveryActive: boolean,
  draftTone: CanvasDraftToolbarState['tone'],
  canPlan: boolean,
  canRun: boolean,
  canStartRun: boolean
): string {
  if (isRecoveryActive) {
    return draftTone === 'danger' ? 'text-rose-200' : 'text-amber-200';
  }

  if (!canPlan && !canRun) {
    return 'text-slate-200';
  }

  if (canStartRun) {
    return 'text-emerald-200';
  }

  return 'text-amber-200';
}

type CanvasToolbarViewModel = {
  workflowStatusLabel: string;
  workflowStatusClass: string;
  workflowStatusTitle: string;
  canPlanTransformation: boolean;
};

function deriveCanvasToolbarViewModel({
  draftToolbarState,
  canPlan,
  canRun,
  canStartRun,
  canvasAuthoringMode,
  planStatusSummary,
  transformationValidation,
  nodeCount,
  edgeCount,
}: Pick<
  CanvasToolbarProps,
  | 'draftToolbarState'
  | 'canPlan'
  | 'canRun'
  | 'canStartRun'
  | 'canvasAuthoringMode'
  | 'planStatusSummary'
  | 'transformationValidation'
  | 'nodeCount'
  | 'edgeCount'
>): CanvasToolbarViewModel {
  const isRecoveryActive = draftToolbarState.showReloadAction;
  const transformationValidationSummary = formatTransformationGraphValidationSummary(
    transformationValidation.summaryCode
  );

  return {
    workflowStatusLabel: resolveWorkflowStatusLabel(
      isRecoveryActive,
      canPlan,
      canRun,
      canStartRun
    ),
    workflowStatusClass: resolveWorkflowStatusClass(
      isRecoveryActive,
      draftToolbarState.tone,
      canPlan,
      canRun,
      canStartRun
    ),
    workflowStatusTitle: `${canvasAuthoringMode}:${planStatusSummary}:${transformationValidationSummary}:${nodeCount}:${edgeCount}`,
    canPlanTransformation: transformationValidation.valid,
  };
}

function useCanvasToolbarPortalTarget(
  placement: NonNullable<CanvasToolbarProps['placement']>
): HTMLElement | null {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (placement !== 'top-bar' || typeof document === 'undefined') {
      setPortalTarget(null);
      return;
    }

    setPortalTarget(document.getElementById('shell-top-bar-canvas-controls'));
  }, [placement]);

  return portalTarget;
}

type CanvasToolbarPrimaryControlsProps = Pick<
  CanvasToolbarProps,
  | 'onAutoLayout'
  | 'onToggleCostOverlay'
  | 'onToggleImpact'
  | 'onToggleColumns'
  | 'onPlan'
  | 'onRun'
  | 'canPlan'
  | 'canRun'
  | 'canEditEdges'
  | 'canStartRun'
  | 'exclusiveOverlayMode'
  | 'canUseCostOverlay'
  | 'impactOverlayEnabled'
  | 'columnLevelLineageEnabled'
> &
  Pick<
    CanvasToolbarViewModel,
    'workflowStatusLabel' | 'workflowStatusClass' | 'workflowStatusTitle' | 'canPlanTransformation'
  >;

function CanvasToolbarPrimaryControls({
  onAutoLayout,
  onToggleCostOverlay,
  onToggleImpact,
  onToggleColumns,
  onPlan,
  onRun,
  canPlan,
  canRun,
  canEditEdges,
  canStartRun,
  exclusiveOverlayMode,
  canUseCostOverlay,
  impactOverlayEnabled,
  columnLevelLineageEnabled,
  workflowStatusLabel,
  workflowStatusClass,
  workflowStatusTitle,
  canPlanTransformation,
}: CanvasToolbarPrimaryControlsProps): JSX.Element {
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
        onClick={onAutoLayout}
        disabled={!canEditEdges}
        className="h-8 gap-1.5 px-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
      >
        <LayoutGrid className="size-4" />
        {canvasViewCopy.toolbarLayoutLabel}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggleImpact}
        className={cn(
          'h-8 gap-1.5 px-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-white',
          impactOverlayEnabled && 'bg-slate-700 text-white'
        )}
      >
        <Target className="size-4" />
        {canvasViewCopy.toolbarImpactLabel}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onToggleColumns}
        className={cn(
          'h-8 gap-1.5 px-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-white',
          columnLevelLineageEnabled && 'bg-slate-700 text-white'
        )}
      >
        <Columns className="size-4" />
        {canvasViewCopy.toolbarColumnsLabel}
      </Button>

      {canUseCostOverlay && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleCostOverlay}
          className={cn(
            'h-8 gap-1.5 px-3 text-xs text-slate-300 hover:bg-slate-800 hover:text-white',
            exclusiveOverlayMode === 'cost' && 'bg-slate-700 text-white'
          )}
        >
          <DollarSign className="size-4" />
          {canvasViewCopy.toolbarCostLabel}
        </Button>
      )}
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

type CanvasToolbarDraftStatusProps = Pick<
  CanvasToolbarProps,
  'draftToolbarState' | 'onReloadLatestDraft'
>;

function CanvasToolbarDraftStatus({
  draftToolbarState,
  onReloadLatestDraft,
}: CanvasToolbarDraftStatusProps): JSX.Element {
  if (draftToolbarState.showReloadAction) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          data-slot="canvas-draft-save-status"
          variant="outline"
          className={cn(
            'h-7 border px-2 text-[11px]',
            draftToolbarState.tone === 'danger'
              ? 'border-rose-500/60 bg-rose-950/40 text-rose-100'
              : 'border-amber-500/60 bg-amber-950/40 text-amber-100'
          )}
        >
          {draftToolbarState.label}
        </Badge>
        <Button
          type="button"
          variant={draftToolbarState.tone === 'danger' ? 'destructive' : 'outline'}
          size="sm"
          onClick={onReloadLatestDraft}
          className="h-8 px-3 text-xs"
        >
          {canvasViewCopy.reloadLatestDraftLabel}
        </Button>
      </div>
    );
  }

  return (
    <Badge
      data-slot="canvas-draft-save-status"
      variant="outline"
      className="h-7 border-slate-700 bg-slate-950/60 px-2 text-[11px] text-slate-200"
    >
      {draftToolbarState.label}
    </Badge>
  );
}

export default function CanvasToolbar(props: CanvasToolbarProps) {
  const placement = props.placement ?? 'inline';
  const portalTarget = useCanvasToolbarPortalTarget(placement);
  const viewModel = deriveCanvasToolbarViewModel(props);

  const content = (
    <div className="flex min-w-0 items-center gap-2">
      <CanvasToolbarPrimaryControls
        onAutoLayout={props.onAutoLayout}
        onToggleCostOverlay={props.onToggleCostOverlay}
        onToggleImpact={props.onToggleImpact}
        onToggleColumns={props.onToggleColumns}
        onPlan={props.onPlan}
        onRun={props.onRun}
        canPlan={props.canPlan}
        canRun={props.canRun}
        canEditEdges={props.canEditEdges}
        canStartRun={props.canStartRun}
        exclusiveOverlayMode={props.exclusiveOverlayMode}
        canUseCostOverlay={props.canUseCostOverlay}
        impactOverlayEnabled={props.impactOverlayEnabled}
        columnLevelLineageEnabled={props.columnLevelLineageEnabled}
        workflowStatusLabel={viewModel.workflowStatusLabel}
        workflowStatusClass={viewModel.workflowStatusClass}
        workflowStatusTitle={viewModel.workflowStatusTitle}
        canPlanTransformation={viewModel.canPlanTransformation}
      />
      <Separator orientation="vertical" className="h-5 bg-slate-700" />
      <CanvasToolbarDraftStatus
        draftToolbarState={props.draftToolbarState}
        onReloadLatestDraft={props.onReloadLatestDraft}
      />
    </div>
  );

  if (placement === 'top-bar') {
    return portalTarget ? createPortal(content, portalTarget) : null;
  }

  return (
    <div className="flex h-10 shrink-0 items-center justify-end gap-3 border-b border-slate-700 bg-slate-900 px-3">
      {content}
    </div>
  );
}
