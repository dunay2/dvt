import { describe, expect, it } from 'vitest';

import DetailSource from './CanvasRelationalExpressionTree.tsx?raw';
import GeometrySource from './canvasRelationalTreeGeometry.ts?raw';
import GraphNodeSource from './CanvasRelationalTreeGraphNode.tsx?raw';
import GraphCardDetailSource from './CanvasRelationalTreeCardDetail.tsx?raw';
import NodeButtonSource from './CanvasRelationalTreeNodeButton.tsx?raw';
import CardMenuSource from './CanvasRelationalTreeCardMenu.tsx?raw';
import InspectionSource from './CanvasRelationalTreeInspection.tsx?raw';
import InspectionModelSource from './relational-inspection/inspectionModel.ts?raw';
import InspectionPanelSource from './relational-inspection/RelationalInspectionPanel.tsx?raw';
import NodePresentationSource from './canvasRelationalNodePresentation.ts?raw';
import RemovalSessionSource from './useCanvasRelationalTreeRemoval.ts?raw';
import CardDetailSource from './canvasRelationalTreeDetails.ts?raw';
import ScalarTreeSource from './CanvasRelationalScalarTree.tsx?raw';
import ScalarGraphSource from './CanvasRelationalScalarGraph.tsx?raw';
import SelectedOperatorSource from './CanvasRelationalTreeSelectedOperatorEditor.tsx?raw';
import MetricsSource from './canvasRelationalTreeGeometryMetrics.ts?raw';
import LayoutSource from './CanvasRelationalTreeLayout.tsx?raw';
import NodeLayerSource from './CanvasRelationalTreeNodes.tsx?raw';
import OperationPortsSource from './CanvasRelationalOperationPorts.tsx?raw';
import OutputSource from './CanvasRelationalTreeOutput.tsx?raw';
import EdgesSource from './relational-layout/RelationalTreeEdges.tsx?raw';
import EdgeActionSource from './relational-layout/RelationalEdgeAction.tsx?raw';
import RelationalEdgeProjectionSource from './relational-layout/relationalTreeEdgeProjection.ts?raw';
import ContentSource from './CanvasRelationalTreeContent.tsx?raw';
import MovementSource from './relational-layout/useRelationalCardMovement.ts?raw';
import SessionActionsSource from './CanvasRelationalTreeSessionActions.tsx?raw';
import AuthoringSource from './CanvasRelationalTreeAuthoring.tsx?raw';
import CatalogueSource from './CanvasRelationalTreeSourceCatalogue.tsx?raw';
import DraftViewportSource from './CanvasRelationalTreeDraftViewport.tsx?raw';
import InlineEditorSource from './CanvasRelationalTreeInlineEditor.tsx?raw';
import OperationShelfSource from './CanvasRelationalTreeOperationShelf.tsx?raw';
import TreeSource from './CanvasRelationalTreeView.tsx?raw';
import ViewportSource from './canvasRelationalTreeViewport.ts?raw';
import ZoomSource from './CanvasRelationalTreeZoomControls.tsx?raw';
import WorkbenchSource from './CanvasRelationalTreeWorkbench.tsx?raw';
import EdgeProjectionSource from './canvasViewportEdgeProjection.ts?raw';
import CanvasShellSource from './CanvasShell.tsx?raw';
import ModelEditorSource from './CanvasModelEditor.tsx?raw';
import ModelTemplateSource from './CanvasModelEditor.templates.tsx?raw';
import ModelToolbarSource from './CanvasModelToolbar.tsx?raw';
import ModelDataPanelSource from './CanvasModelDataPanel.tsx?raw';
import CodeWorkbenchSource from './DvtTransformCodeWorkbenchContent.tsx?raw';
import ApplyCommandSource from './canvasRelationalTreeApplyCommand.ts?raw';
import WorkbenchModelSource from './useCanvasRelationalTreeWorkbenchModel.ts?raw';
import AuthoringSessionSource from './useCanvasRelationalTreeAuthoringSession.ts?raw';
import GraphAuthoringSource from './useCanvasRelationalGraphAuthoring.ts?raw';
import DraftHydrationSource from './useCanvasRelationalAuthoringDraftHydration.ts?raw';
import AuthoringModelSource from './canvasRelationalTreeAuthoringModel.ts?raw';
import AuthoringCandidatesSource from './canvasRelationalTreeAuthoringCandidates.ts?raw';
import AuthoringProjectionSource from './canvasRelationalTreeAuthoringProjection.ts?raw';
import ExistingDraftSource from './canvasRelationalTreeExistingDraft.ts?raw';
import ExistingSeedSource from './useCanvasRelationalTreeExistingSeed.ts?raw';
import OperandSlotsSource from './useCanvasRelationalOperandSlots.ts?raw';
import ProjectionAuthoringSource from './canvasRelationalTreeProjectionAuthoring.ts?raw';
import UseViewportSource from './useCanvasRelationalTreeViewport.ts?raw';
import PendingSource from './relational-source-occurrence/pendingSourceOccurrence.ts?raw';
import ApplyDraftSource from './canvasRelationalTreeApplyDraft.ts?raw';
import CatalogueProjectionSource from './canvasRelationalTreeCatalogue.ts?raw';

describe('Canvas relational-tree Workbench architecture', () => {
  it('keeps persistence policy and presentation projection out of the React session and source identity', () => {
    expect(AuthoringSessionSource).toContain('prepareCanvasRelationalTreeApply');
    expect(AuthoringSessionSource).not.toContain('createCanvasRelationalAuthoringDraft');
    expect(AuthoringSessionSource).not.toContain('canonicalizeCanvasInspectorNodeDraft');
    expect(AuthoringSessionSource).not.toContain('areCanvasInspectorNodeDraftsEqual');
    expect(WorkbenchModelSource).not.toContain('configuredProducerIds');
    expect(PendingSource).not.toMatch(/canvasRelationalTree|buildCanvasRelationalTreeRelation/);
    for (const pure of [
      ApplyDraftSource,
      ApplyCommandSource,
      CatalogueProjectionSource,
      PendingSource,
    ]) {
      expect(pure).not.toMatch(/from ['"]react['"]|\buse(?:State|Effect|Callback|Memo)\s*\(/);
    }
    expect(CatalogueProjectionSource).not.toMatch(
      /encodeDvt|onApplyNodeDraft|restorePendingSourceOccurrence/
    );
    expect(ApplyDraftSource).not.toMatch(/JSX|\.tsx|onApplyNodeDraft/);
  });
  it('keeps query consumption, catalogue, graph and contextual detail in bounded components', () => {
    expect(InspectionSource.split('\n').length).toBeLessThan(80);
    expect(InspectionModelSource.split('\n').length).toBeLessThan(120);
    expect(InspectionPanelSource.split('\n').length).toBeLessThan(100);
    expect(WorkbenchSource.split('\n').length).toBeLessThan(140);
    expect(CatalogueSource.split('\n').length).toBeLessThan(120);
    expect(TreeSource.split('\n').length).toBeLessThan(150);
    expect(LayoutSource.split('\n').length).toBeLessThan(190);
    expect(NodeLayerSource.split('\n').length).toBeLessThan(140);
    expect(OperationPortsSource.split('\n').length).toBeLessThan(120);
    expect(OutputSource.split('\n').length).toBeLessThan(120);
    expect(EdgesSource.split('\n').length).toBeLessThan(150);
    expect(EdgeActionSource.split('\n').length).toBeLessThan(60);
    expect(RelationalEdgeProjectionSource.split('\n').length).toBeLessThan(100);
    expect(ContentSource.split('\n').length).toBeLessThan(100);
    expect(MovementSource.split('\n').length).toBeLessThan(200);
    expect(GraphNodeSource.split('\n').length).toBeLessThan(140);
    expect(GeometrySource.split('\n').length).toBeLessThan(150);
    expect(CardDetailSource.split('\n').length).toBeLessThan(100);
    expect(ScalarTreeSource.split('\n').length).toBeLessThan(110);
    expect(ScalarGraphSource.split('\n').length).toBeLessThan(160);
    expect(SelectedOperatorSource.split('\n').length).toBeLessThan(100);
    expect(MetricsSource.split('\n').length).toBeLessThan(110);
    expect(ViewportSource.split('\n').length).toBeLessThan(80);
    expect(UseViewportSource.split('\n').length).toBeLessThan(130);
    expect(ZoomSource.split('\n').length).toBeLessThan(80);
    expect(DetailSource.split('\n').length).toBeLessThan(100);
    expect(WorkbenchModelSource.split('\n').length).toBeLessThan(180);
    expect(AuthoringSessionSource.split('\n').length).toBeLessThan(180);
    expect(GraphAuthoringSource.split('\n').length).toBeLessThan(120);
    expect(DraftHydrationSource.split('\n').length).toBeLessThan(80);
    expect(ApplyCommandSource.split('\n').length).toBeLessThan(100);
    expect(AuthoringModelSource.split('\n').length).toBeLessThan(200);
    expect(AuthoringCandidatesSource.split('\n').length).toBeLessThan(150);
    expect(AuthoringProjectionSource.split('\n').length).toBeLessThan(90);
    expect(ExistingDraftSource.split('\n').length).toBeLessThan(80);
    expect(ExistingSeedSource.split('\n').length).toBeLessThan(80);
    expect(AuthoringSource.split('\n').length).toBeLessThan(140);
    expect(DraftViewportSource.split('\n').length).toBeLessThan(170);
    expect(OperationShelfSource.split('\n').length).toBeLessThan(140);
    expect(InlineEditorSource.split('\n').length).toBeLessThan(80);
    expect(OperandSlotsSource.split('\n').length).toBeLessThan(90);
    expect(ProjectionAuthoringSource.split('\n').length).toBeLessThan(60);
    expect(SessionActionsSource.split('\n').length).toBeLessThan(80);
  });

  it('does not introduce a second Canvas or semantic write authority', () => {
    const combined = [
      WorkbenchSource,
      WorkbenchModelSource,
      CatalogueSource,
      TreeSource,
      LayoutSource,
      NodeLayerSource,
      OperationPortsSource,
      OutputSource,
      EdgesSource,
      EdgeActionSource,
      RelationalEdgeProjectionSource,
      ContentSource,
      MovementSource,
      GraphNodeSource,
      NodeButtonSource,
      CardMenuSource,
      InspectionSource,
      InspectionModelSource,
      InspectionPanelSource,
      NodePresentationSource,
      GeometrySource,
      CardDetailSource,
      ScalarTreeSource,
      ScalarGraphSource,
      SelectedOperatorSource,
      MetricsSource,
      ViewportSource,
      UseViewportSource,
      ZoomSource,
      DetailSource,
      AuthoringSource,
      DraftViewportSource,
      OperationShelfSource,
      InlineEditorSource,
    ].join('\n');
    expect(combined).not.toContain('@xyflow/react');
    expect(combined).not.toContain('applyDvtSubstraitSemanticDocument');
    expect(combined).not.toContain('encodeDvtSubstrait');
    expect(combined).not.toContain('create(');
    expect(AuthoringSessionSource).toContain('createCanvasRelationalTreeApplyCommand');
    expect(AuthoringSessionSource).toContain('useCanvasRelationalTreeExistingSeed');
    expect(AuthoringSessionSource).toContain('useCanvasRelationalTreeRemoval');
    expect(RemovalSessionSource).toContain('useRelationRemoval');
    expect(RemovalSessionSource).not.toContain('onApplyNodeDraft');
    expect(CardMenuSource).not.toContain('onApplyNodeDraft');
    expect(AuthoringProjectionSource).toContain('projectCanvasRelationalTree');
    expect(AuthoringProjectionSource).not.toContain('onApplyNodeDraft');
    expect(ApplyCommandSource).toContain('const result = authoring.onApplyNodeDraft(');
    expect(ApplyCommandSource).toContain("result.outcome === 'rejected'");
    expect(ApplyCommandSource).not.toContain('applyInspectorNodeDraft');
    expect(WorkbenchSource).not.toContain('CanvasRelationalTreeAuthoringPanel');
    expect(WorkbenchSource).toContain('CanvasRelationalTreeSessionActions');
    expect(WorkbenchSource).not.toContain('CanvasRelationalTreeAuthoringPrompt');
    expect(WorkbenchSource).not.toContain('CanvasRelationalTreeDraftView');
    expect(AuthoringSource).not.toContain('CanvasRelationalTreeOperationPanel');
    expect(AuthoringSource).toContain('CanvasRelationalTreeOperationShelf');
    expect(AuthoringSource).toContain('CanvasRelationalTreeDraftViewport');
    expect(WorkbenchSource).not.toContain('minmax(15rem,20rem)');
    expect(DetailSource).not.toContain('<dl');
    expect(DetailSource).toContain('projectSemanticWorkbenchGraph');
    expect(DetailSource).toContain("view: 'relation-expressions'");
    expect(DetailSource).not.toContain('GitMerge');
    expect(CardDetailSource).toContain('projectSemanticWorkbenchGraph');
    expect(GraphNodeSource).toContain('CanvasRelationalTreeCardDetail');
    expect(GraphCardDetailSource).toContain('CanvasRelationalScalarTree');
    expect(DetailSource).toContain('CanvasRelationalScalarTree');
    expect(CardDetailSource).not.toContain('onApplyNodeDraft');
    expect(AuthoringSource).toContain('selectedRelationId');
    expect(InlineEditorSource).toContain('selectedRelationId');
  });

  it('keeps internal semantics out of edges and routes Models to one editor owner', () => {
    for (const view of [ModelTemplateSource, ModelToolbarSource, ModelDataPanelSource]) {
      expect(view).not.toMatch(/from ['"][^'"]*(?:stores\/|ports\/|useCanvas)/);
      expect(view).not.toMatch(/\buse(?:State|Effect|Callback|Memo)\s*\(/);
    }
    expect(EdgeProjectionSource).not.toMatch(/Substrait|[Cc]omposition|onActivate/);
    expect(CanvasShellSource).toContain('<CanvasModelEditor');
    expect(CanvasShellSource).not.toContain('<CanvasRelationalTreeWorkbench');
    expect(CanvasShellSource).not.toContain("selectOperationalDrawerTab('semantic')");
    expect(ModelEditorSource).toContain('<CanvasRelationalTreeWorkbench');
    expect(ModelEditorSource).not.toContain("from 'react-dom'");
    expect(ModelEditorSource).toContain("draftStatus.persistence !== 'durable'");
    expect(ModelEditorSource).not.toContain(
      '[&:has([data-slot=canvas-relational-tree-apply])_[data-slot=canvas-model-save-status]]:hidden'
    );
    expect(CodeWorkbenchSource).not.toContain('CanvasRelationalTreeWorkbench');
    expect(CodeWorkbenchSource).not.toContain('pendingCompositionAuthoring');
    expect(CodeWorkbenchSource).not.toContain('CanvasRelationalCompositionTruth');
    expect(CodeWorkbenchSource).toContain('canvas-open-semantic-editor');
  });
});
