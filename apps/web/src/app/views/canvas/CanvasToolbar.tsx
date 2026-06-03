/** Owned concern: render the Canvas toolbar as a passive shell command surface. */
import { Separator } from '../../components/ui/separator';
import { CanvasToolbarDraftStatus } from './CanvasToolbarDraftStatus';
import { CanvasToolbarPrimaryControls } from './CanvasToolbarPrimaryControls';
import { CanvasViewMenuContributionRegistrar } from './CanvasViewMenuControls';
import type {
  CanvasGraphAuthoringMode,
  NodeKindRegistration,
} from '../../plugins/nodeTypeContracts';
import type { CanvasPaletteId } from './canvasPalette';
import type { CanvasRouteState } from './canvasDraftPresentationModel';
import { deriveCanvasToolbarViewModel } from './canvasToolbarViewModel';
import type { CanvasDraftToolbarState } from './canvasDraftToolbarState';
import type { TransformationGraphValidationResult } from './transformationGraphValidation';
import { canvasChromeClasses } from './canvasChromeTokens';
import type { PlanRunReadinessReadModel } from './canvasPlanReadiness';

export type CanvasToolbarProps = {
  readonly onAutoLayout: () => void;
  readonly onToggleCostOverlay: () => void;
  readonly onToggleImpact: () => void;
  readonly onToggleColumns: () => void;
  readonly onToggleGridVisible: () => void;
  readonly onGridColorChange: (color: CanvasPaletteId) => void;
  readonly onToggleSnapToGrid: () => void;
  readonly onExportProjectSnapshot: () => void;
  readonly onImportProjectSnapshotFile: (file: File) => void;
  readonly onReloadLatestDraft: () => void;
  readonly onPlan: () => void;
  readonly onRun: () => void;
  readonly onCreateAuthoringNode?: (registration: NodeKindRegistration) => void;
  readonly routeState: CanvasRouteState;
  readonly draftToolbarState: CanvasDraftToolbarState;
  readonly canPlan: boolean;
  readonly canPlanGraph: boolean;
  readonly canRun: boolean;
  readonly canEditEdges: boolean;
  readonly canExportProjectSnapshot: boolean;
  readonly canImportProjectSnapshot: boolean;
  readonly canStartRun: boolean;
  readonly planRunReadiness: PlanRunReadinessReadModel;
  readonly planStatusSummary: string;
  readonly canvasAuthoringMode: CanvasGraphAuthoringMode;
  readonly exclusiveOverlayMode: 'runtime' | 'cost';
  readonly canUseCostOverlay: boolean;
  readonly impactOverlayEnabled: boolean;
  readonly columnLevelLineageEnabled: boolean;
  readonly canvasGridVisible: boolean;
  readonly canvasGridColor: CanvasPaletteId;
  readonly canvasSnapToGrid: boolean;
  readonly transformationValidation: TransformationGraphValidationResult;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly authoringNodeKinds?: readonly NodeKindRegistration[];
  readonly variant?: 'standalone' | 'inline';
};

export default function CanvasToolbar(props: CanvasToolbarProps) {
  const viewModel = deriveCanvasToolbarViewModel(props);
  const variant = props.variant ?? 'standalone';

  return (
    <div
      className={
        variant === 'inline' ? canvasChromeClasses.toolbarInline : canvasChromeClasses.toolbar
      }
    >
      <div className="flex min-w-0 items-center gap-2">
        <CanvasViewMenuContributionRegistrar
          canEditEdges={props.canEditEdges}
          canUseCostOverlay={props.canUseCostOverlay}
          exclusiveOverlayMode={props.exclusiveOverlayMode}
          impactOverlayEnabled={props.impactOverlayEnabled}
          columnLevelLineageEnabled={props.columnLevelLineageEnabled}
          canvasGridVisible={props.canvasGridVisible}
          canvasGridColor={props.canvasGridColor}
          canvasSnapToGrid={props.canvasSnapToGrid}
          onAutoLayout={props.onAutoLayout}
          onToggleCostOverlay={props.onToggleCostOverlay}
          onToggleImpact={props.onToggleImpact}
          onToggleColumns={props.onToggleColumns}
          onToggleGridVisible={props.onToggleGridVisible}
          onGridColorChange={props.onGridColorChange}
          onToggleSnapToGrid={props.onToggleSnapToGrid}
        />
        <CanvasToolbarPrimaryControls
          onExportProjectSnapshot={props.onExportProjectSnapshot}
          onImportProjectSnapshotFile={props.onImportProjectSnapshotFile}
          onPlan={props.onPlan}
          onRun={props.onRun}
          onCreateAuthoringNode={props.onCreateAuthoringNode}
          canPlan={props.canPlan}
          canRun={props.canRun}
          canEditEdges={props.canEditEdges}
          canExportProjectSnapshot={props.canExportProjectSnapshot}
          canImportProjectSnapshot={props.canImportProjectSnapshot}
          canStartRun={props.canStartRun}
          planRunReadiness={props.planRunReadiness}
          workflowStatusLabel={viewModel.workflowStatusLabel}
          workflowStatusClass={viewModel.workflowStatusClass}
          workflowStatusTitle={viewModel.workflowStatusTitle}
          canPlanGraph={viewModel.canPlanGraph}
          authoringNodeKinds={props.authoringNodeKinds ?? []}
        />
        <Separator orientation="vertical" className={canvasChromeClasses.separator} />
        <CanvasToolbarDraftStatus
          draftToolbarState={props.draftToolbarState}
          onReloadLatestDraft={props.onReloadLatestDraft}
        />
      </div>
    </div>
  );
}
