import { describe, expect, it } from 'vitest';
import ts from 'typescript';

import { readArchitectureSiblingSource } from '../architecture.test.support';

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
import ModelOutputInspectorSource from './CanvasModelOutputInspector.tsx?raw';
import CardDetailSource from './canvasRelationalTreeDetails.ts?raw';
import ScalarTreeSource from './CanvasRelationalScalarTree.tsx?raw';
import ScalarGraphSource from './CanvasRelationalScalarGraph.tsx?raw';
import SelectedOperatorSource from './CanvasRelationalTreeSelectedOperatorEditor.tsx?raw';
import MetricsSource from './canvasRelationalTreeGeometryMetrics.ts?raw';
import LayoutSource from './CanvasRelationalTreeLayout.tsx?raw';
import DetailHookSource from './useCanvasRelationalTreeDetails.ts?raw';
import NodeLayerSource from './CanvasRelationalTreeNodes.tsx?raw';
import OperationPortsSource from './CanvasRelationalOperationPorts.tsx?raw';
import OutputSource from './CanvasRelationalTreeOutput.tsx?raw';
import EdgesSource from './relational-layout/RelationalTreeEdges.tsx?raw';
import EdgeActionSource from './relational-layout/RelationalEdgeAction.tsx?raw';
import RelationalEdgeProjectionSource from './relational-layout/relationalTreeEdgeProjection.ts?raw';
import ContentSource from './CanvasRelationalTreeContent.tsx?raw';
import MovementSource from './relational-layout/useRelationalCardMovement.ts?raw';
import AuthoringSource from './CanvasRelationalTreeAuthoring.tsx?raw';
import OperationDraftInspectorSource from './CanvasRelationalOperationDraftInspector.tsx?raw';
import CatalogueSource from './CanvasRelationalTreeSourceCatalogue.tsx?raw';
import DraftViewportSource from './CanvasRelationalTreeDraftViewport.tsx?raw';
import InlineEditorSource from './CanvasRelationalTreeInlineEditor.tsx?raw';
import OperationShelfSource from './CanvasRelationalTreeOperationShelf.tsx?raw';
import TreeSource from './CanvasRelationalTreeView.tsx?raw';
import ViewportSource from './canvasRelationalTreeViewport.ts?raw';
import ZoomSource from './CanvasRelationalTreeZoomControls.tsx?raw';
import WorkbenchSource from './CanvasRelationalTreeWorkbench.tsx?raw';
import EdgeProjectionSource from './canvasViewportEdgeProjection.ts?raw';
import ModelTemplateSource from './CanvasModelEditor.templates.tsx?raw';
import ModelToolbarSource from './CanvasModelToolbar.tsx?raw';
import ModelDataPanelSource from './CanvasModelDataPanel.tsx?raw';
import WorkbenchModelSource from './useCanvasRelationalTreeWorkbenchModel.ts?raw';
import UseViewportSource from './useCanvasRelationalTreeViewport.ts?raw';
import ColumnInteractionSource from './canvasNodeColumnInteraction.ts?raw';
import PresentationNodeSource from './canvasPresentationNode.ts?raw';

function isDisplayNameTarget(node: ts.Node): boolean {
  if (ts.isParenthesizedExpression(node)) return isDisplayNameTarget(node.expression);
  if (ts.isPropertyAccessExpression(node)) return node.name.text === 'displayName';
  return (
    ts.isElementAccessExpression(node) &&
    ts.isStringLiteralLike(node.argumentExpression) &&
    node.argumentExpression.text === 'displayName'
  );
}

function displayNameMutationSites(source: string): string[] {
  const file = ts.createSourceFile('presentation.ts', source, ts.ScriptTarget.Latest, true);
  const sites: string[] = [];
  function visit(node: ts.Node): void {
    ts.forEachChild(node, visit);
    if (!ts.isBinaryExpression(node)) return;
    if (node.operatorToken.kind < ts.SyntaxKind.FirstAssignment) return;
    if (node.operatorToken.kind > ts.SyntaxKind.LastAssignment) return;
    if (isDisplayNameTarget(node.left)) sites.push(node.getText(file));
  }
  visit(file);
  return sites;
}

const ModelDataPanelStyles = readArchitectureSiblingSource(
  import.meta.dirname,
  'CanvasModelDataPanel.module.css'
);

const presentationLimits = [
  [InspectionSource, 80],
  [InspectionModelSource, 120],
  [InspectionPanelSource, 100],
  [CatalogueSource, 120],
  [TreeSource, 150],
  [LayoutSource, 190],
  [NodeLayerSource, 140],
  [OperationPortsSource, 120],
  [OutputSource, 120],
  [EdgesSource, 150],
  [EdgeActionSource, 60],
  [RelationalEdgeProjectionSource, 100],
  [ContentSource, 100],
  [MovementSource, 200],
  [GraphNodeSource, 140],
  [GeometrySource, 150],
  [CardDetailSource, 100],
  [ScalarTreeSource, 110],
  [ScalarGraphSource, 160],
  [SelectedOperatorSource, 100],
  [MetricsSource, 110],
  [ViewportSource, 80],
  [UseViewportSource, 130],
  [ZoomSource, 80],
  [DetailSource, 100],
] as const;

describe('Canvas relational Workbench presentation boundaries', () => {
  it('keeps Model sample layout and compact variants in its own stylesheet', () => {
    expect(ModelDataPanelSource).toContain("from './CanvasModelDataPanel.module.css'");
    expect(ModelDataPanelSource).not.toMatch(
      /\bstyle\s*=|className\s*=\s*['"]|className\s*=\s*\{(?:`|compact\s*\?)/
    );
    expect(ModelDataPanelSource).toContain('className={styles.panel}');
    expect(ModelDataPanelSource).toContain('data-compact={compact}');
    expect(ModelDataPanelSource).toContain('className={styles.empty}');
    expect(ModelDataPanelSource).toContain('data-slot="canvas-model-preview"');
    expect(ModelDataPanelSource).toContain('data-slot="canvas-model-data-stale"');
    expect(ModelDataPanelSource).toContain('gridStyles.actions');
    expect(ModelDataPanelSource).toContain('gridStyles.sampleSummary');
    expect(ModelDataPanelStyles).toContain('@layer utilities');
    expect(ModelDataPanelStyles).toContain(".panel[data-compact='true']");
    expect(ModelDataPanelStyles).toContain(".previewAction:where([data-compact='true'])");
    expect(ModelDataPanelStyles).toContain('min-height: 6rem');
    expect(ModelDataPanelStyles).toContain('min-height: 10rem');
    expect(ModelDataPanelStyles).toContain('var(--text-muted)');
  });
  it('projects explicit Input posture instead of rebuilding semantic policy in the adapter', () => {
    expect(ColumnInteractionSource).toContain('presentation?.inputBindingPosture');
    expect(ColumnInteractionSource).not.toMatch(
      /readDvtTransformAuthoringAuthority|recoveryInputs/
    );
    expect(PresentationNodeSource).toContain('structural?.semantic?.document');
    expect(PresentationNodeSource).not.toMatch(
      /deriveSubstraitPublication|resolveUnmappedCanvasReadFields/
    );
  });
  it('keeps retained inspection styling outside JSX and preserves its semantic workspace class', () => {
    expect(InspectionSource).toContain("from './CanvasRelationalTreeInspection.module.css'");
    expect(InspectionSource).not.toMatch(/\bstyle\s*=|className\s*=\s*['"]|(?:border|text)-\(--/);
    expect(InspectionSource).toContain('styles.inspection');
    expect(InspectionSource).toContain('styles.recoveryNotice');
    expect(InspectionSource).toContain('canvas-operation-workspace ${styles.workspace}');
    expect(InspectionSource).toContain('role="status"');
    expect(InspectionSource).toContain('data-slot="canvas-producer-input-recovery"');
  });
  it('keeps JOIN type-code suppression in the shared read-only presentation mapper', () => {
    expect(NodePresentationSource).toContain('isCanvasJoinOperation(node.displayName)');
    expect(displayNameMutationSites(NodePresentationSource)).toEqual([]);
    expect(NodePresentationSource).not.toMatch(/session\.apply|useEffect/);
    for (const [source, writes] of [
      ['node.displayName = "changed"', 1],
      ['node.displayName += "suffix"', 1],
      ['node["displayName"] ??= "name"', 1],
      ['(node.displayName) = "name"', 1],
      ['node.displayName === "JOIN"', 0],
      ['node.displayName == "JOIN"', 0],
    ] as const)
      expect(displayNameMutationSites(source)).toHaveLength(writes);
    for (const source of [NodeButtonSource, ModelOutputInspectorSource]) {
      expect(source).toContain('resolveCanvasRelationalNodeCopy');
      expect(source).not.toContain('isCanvasJoinOperation');
    }
  });
  it('keeps inspection, graph and viewport components within their size limits', () => {
    for (const [source, limit] of presentationLimits) {
      expect(source.split('\n').length).toBeLessThan(limit);
    }
    expect(DetailHookSource).toContain('projectCanvasRelationalTreeDetails');
    expect(DetailHookSource.split('\n').length).toBeLessThan(40);
  });
  it('does not introduce a second Canvas or semantic write authority', () => {
    const subjects = [
      ...presentationLimits.map(([source]) => source),
      WorkbenchSource,
      WorkbenchModelSource,
      NodeButtonSource,
      CardMenuSource,
      NodePresentationSource,
      AuthoringSource,
      OperationDraftInspectorSource,
      DraftViewportSource,
      OperationShelfSource,
      InlineEditorSource,
    ];
    for (const source of subjects) {
      expect(source).not.toMatch(
        /@xyflow\/react|applyDvtSubstraitSemanticDocument|encodeDvtSubstrait|create\(/
      );
    }
  });
  it('keeps expression and card detail on the existing read-only projections', () => {
    expect(DetailSource).not.toContain('<dl');
    expect(DetailSource).toContain('projectSemanticWorkbenchGraph');
    expect(DetailSource).toContain("view: 'relation-expressions'");
    expect(DetailSource).not.toContain('GitMerge');
    expect(CardDetailSource).toContain('projectSemanticWorkbenchRelations');
    expect(CardDetailSource).not.toContain('applyCanvasInspectorNodeDraft');
    expect(CardDetailSource).not.toContain('createCanvasRelationalTreeNodeDraft');
    expect(GraphNodeSource).toContain('CanvasRelationalTreeCardDetail');
    expect(GraphCardDetailSource).toContain('CanvasRelationalScalarTree');
    expect(DetailSource).toContain('CanvasRelationalScalarTree');
    expect(CardDetailSource).not.toContain('onApplyNodeDraft');
  });
  it('keeps passive Model views and edge projection free of semantic ownership', () => {
    for (const view of [ModelTemplateSource, ModelToolbarSource, ModelDataPanelSource]) {
      expect(view).not.toMatch(/from ['"][^'"]*(?:stores\/|ports\/|useCanvas)/);
      expect(view).not.toMatch(/\buse(?:State|Effect|Callback|Memo)\s*\(/);
    }
    expect(EdgeProjectionSource).not.toMatch(/Substrait|[Cc]omposition|onActivate/);
  });
});
