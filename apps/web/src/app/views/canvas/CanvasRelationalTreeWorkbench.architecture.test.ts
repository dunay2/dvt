import { describe, expect, it } from 'vitest';

import DetailSource from './CanvasRelationalJoinExpressionTree.tsx?raw';
import GeometrySource from './canvasRelationalTreeGeometry.ts?raw';
import GraphNodeSource from './CanvasRelationalTreeGraphNode.tsx?raw';
import NodeButtonSource from './CanvasRelationalTreeNodeButton.tsx?raw';
import CardMenuSource from './CanvasRelationalTreeCardMenu.tsx?raw';
import InspectionSource from './CanvasRelationalTreeInspection.tsx?raw';
import RemovalSessionSource from './useCanvasRelationalTreeRemoval.ts?raw';
import SemanticZoomSource from './canvasRelationalTreeSemanticZoom.ts?raw';
import ScalarTreeSource from './CanvasRelationalScalarTree.tsx?raw';
import ScalarGraphSource from './CanvasRelationalScalarGraph.tsx?raw';
import SelectedOperatorSource from './CanvasRelationalTreeSelectedOperatorEditor.tsx?raw';
import MetricsSource from './canvasRelationalTreeGeometryMetrics.ts?raw';
import LayoutSource from './CanvasRelationalTreeLayout.tsx?raw';
import EdgesSource from './relational-layout/RelationalTreeEdges.tsx?raw';
import ContentSource from './CanvasRelationalTreeContent.tsx?raw';
import MovementSource from './relational-layout/useRelationalCardMovement.ts?raw';
import SessionActionsSource from './CanvasRelationalTreeSessionActions.tsx?raw';
import BlockCanvasSource from './CanvasRelationalTreeBlockCanvas.tsx?raw';
import CatalogueSource from './CanvasRelationalTreeSourceCatalogue.tsx?raw';
import DraftViewportSource from './CanvasRelationalTreeDraftViewport.tsx?raw';
import InlineEditorSource from './CanvasRelationalTreeInlineEditor.tsx?raw';
import OperandSlotSource from './CanvasRelationalTreeOperandSlot.tsx?raw';
import OperandCanvasSource from './CanvasRelationalTreeOperandCanvas.tsx?raw';
import OperationShelfSource from './CanvasRelationalTreeOperationShelf.tsx?raw';
import ReplacementDialogSource from './operation-menu/CanvasOperationReplacementDialog.tsx?raw';
import TreeSource from './CanvasRelationalTreeView.tsx?raw';
import ViewportSource from './canvasRelationalTreeViewport.ts?raw';
import ZoomSource from './CanvasRelationalTreeZoomControls.tsx?raw';
import WorkbenchSource from './CanvasRelationalTreeWorkbench.tsx?raw';
import EdgeProjectionSource from './canvasViewportEdgeProjection.ts?raw';
import CanvasShellSource from './CanvasShell.tsx?raw';
import ModelEditorSource from './CanvasModelEditor.tsx?raw';
import CodeWorkbenchSource from './DvtTransformCodeWorkbenchContent.tsx?raw';
import ApplyCommandSource from './useCanvasRelationalTreeApplyCommand.ts?raw';
import WorkbenchModelSource from './useCanvasRelationalTreeWorkbenchModel.ts?raw';
import AuthoringSessionSource from './useCanvasRelationalTreeAuthoringSession.ts?raw';
import AuthoringModelSource from './canvasRelationalTreeAuthoringModel.ts?raw';
import AuthoringProjectionSource from './canvasRelationalTreeAuthoringProjection.ts?raw';
import ExistingJoinDraftSource from './canvasRelationalTreeExistingJoinDraft.ts?raw';
import AuthoringOptionsSource from './useCanvasRelationalTreeAuthoringOptions.ts?raw';
import ExistingJoinSeedSource from './useCanvasRelationalTreeExistingJoinSeed.ts?raw';
import JoinDraftActionsSource from './useCanvasRelationalTreeJoinDraftActions.ts?raw';
import OperandSlotsSource from './useCanvasRelationalOperandSlots.ts?raw';
import ProjectionAuthoringSource from './canvasRelationalTreeProjectionAuthoring.ts?raw';
import UseViewportSource from './useCanvasRelationalTreeViewport.ts?raw';

describe('Canvas relational-tree Workbench architecture', () => {
  it('keeps query consumption, catalogue, graph and contextual detail in bounded components', () => {
    expect(WorkbenchSource.split('\n').length).toBeLessThan(140);
    expect(CatalogueSource.split('\n').length).toBeLessThan(120);
    expect(TreeSource.split('\n').length).toBeLessThan(150);
    expect(LayoutSource.split('\n').length).toBeLessThan(190);
    expect(EdgesSource.split('\n').length).toBeLessThan(150);
    expect(ContentSource.split('\n').length).toBeLessThan(100);
    expect(MovementSource.split('\n').length).toBeLessThan(200);
    expect(GraphNodeSource.split('\n').length).toBeLessThan(140);
    expect(GeometrySource.split('\n').length).toBeLessThan(150);
    expect(SemanticZoomSource.split('\n').length).toBeLessThan(100);
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
    expect(ApplyCommandSource.split('\n').length).toBeLessThan(100);
    expect(AuthoringModelSource.split('\n').length).toBeLessThan(260);
    expect(AuthoringProjectionSource.split('\n').length).toBeLessThan(90);
    expect(ExistingJoinDraftSource.split('\n').length).toBeLessThan(80);
    expect(ExistingJoinSeedSource.split('\n').length).toBeLessThan(80);
    expect(JoinDraftActionsSource.split('\n').length).toBeLessThan(100);
    expect(BlockCanvasSource.split('\n').length).toBeLessThan(140);
    expect(DraftViewportSource.split('\n').length).toBeLessThan(170);
    expect(OperationShelfSource.split('\n').length).toBeLessThan(140);
    expect(ReplacementDialogSource.split('\n').length).toBeLessThan(80);
    expect(InlineEditorSource.split('\n').length).toBeLessThan(80);
    expect(OperandSlotSource.split('\n').length).toBeLessThan(80);
    expect(OperandCanvasSource.split('\n').length).toBeLessThan(80);
    expect(AuthoringOptionsSource.split('\n').length).toBeLessThan(100);
    expect(OperandSlotsSource.split('\n').length).toBeLessThan(90);
    expect(ProjectionAuthoringSource.split('\n').length).toBeLessThan(60);
    expect(SessionActionsSource.split('\n').length).toBeLessThan(80);
    expect(WorkbenchModelSource).toContain('projectCanvasRelationalTree');
  });

  it('does not introduce a second Canvas or semantic write authority', () => {
    const combined = [
      WorkbenchSource,
      WorkbenchModelSource,
      CatalogueSource,
      TreeSource,
      LayoutSource,
      EdgesSource,
      ContentSource,
      MovementSource,
      GraphNodeSource,
      NodeButtonSource,
      CardMenuSource,
      InspectionSource,
      GeometrySource,
      SemanticZoomSource,
      ScalarTreeSource,
      ScalarGraphSource,
      SelectedOperatorSource,
      MetricsSource,
      ViewportSource,
      UseViewportSource,
      ZoomSource,
      DetailSource,
      BlockCanvasSource,
      DraftViewportSource,
      OperationShelfSource,
      InlineEditorSource,
      OperandSlotSource,
      OperandCanvasSource,
    ].join('\n');
    expect(combined).not.toContain('@xyflow/react');
    expect(combined).not.toContain('applyDvtSubstraitSemanticDocument');
    expect(combined).not.toContain('encodeDvtSubstrait');
    expect(combined).not.toContain('create(');
    expect(AuthoringSessionSource).toContain('useCanvasRelationalTreeApplyCommand');
    expect(AuthoringSessionSource).toContain('useCanvasRelationalTreeExistingJoinSeed');
    expect(AuthoringSessionSource).toContain('useCanvasRelationalTreeRemoval');
    expect(RemovalSessionSource).toContain('removeCanvasRelationalTreeNode');
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
    expect(BlockCanvasSource).not.toContain('CanvasRelationalTreeOperationPanel');
    expect(BlockCanvasSource).toContain('CanvasRelationalTreeOperationShelf');
    expect(BlockCanvasSource).toContain('CanvasRelationalTreeDraftViewport');
    expect(WorkbenchSource).not.toContain('minmax(15rem,20rem)');
    expect(DetailSource).not.toContain('<dl');
    expect(DetailSource).toContain('projectSemanticWorkbenchGraph');
    expect(DetailSource).toContain("view: 'join-expression'");
    expect(DetailSource).not.toContain('GitMerge');
    expect(SemanticZoomSource).toContain('projectSemanticWorkbenchGraph');
    expect(GraphNodeSource).toContain('CanvasRelationalScalarTree');
    expect(DetailSource).toContain('CanvasRelationalScalarTree');
    expect(SemanticZoomSource).not.toContain('onApplyNodeDraft');
    expect(BlockCanvasSource).toContain('selectedRelationId');
    expect(InlineEditorSource).toContain('selectedRelationId');
  });

  it('keeps internal semantics out of edges and routes Models to one editor owner', () => {
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
