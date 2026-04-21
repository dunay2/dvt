import { createPortal } from 'react-dom';

import { Separator } from '../../components/ui/separator';
import { CanvasToolbarDraftStatus } from './CanvasToolbarDraftStatus';
import { CanvasToolbarPrimaryControls } from './CanvasToolbarPrimaryControls';
import type { CanvasRouteState } from './canvasDraftPresentationModel';
import { deriveCanvasToolbarViewModel } from './canvasToolbarViewModel';
import type { CanvasDraftToolbarState } from './canvasDraftToolbarState';
import type { TransformationGraphValidationResult } from './transformationGraphValidation';
import { useCanvasToolbarPortalTarget } from './useCanvasToolbarPortalTarget';

export type CanvasToolbarProps = {
  readonly placement?: 'inline' | 'top-bar';
  readonly onAutoLayout: () => void;
  readonly onToggleCostOverlay: () => void;
  readonly onToggleImpact: () => void;
  readonly onToggleColumns: () => void;
  readonly onReloadLatestDraft: () => void;
  readonly onPlan: () => void;
  readonly onRun: () => void;
  readonly routeState: CanvasRouteState;
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
