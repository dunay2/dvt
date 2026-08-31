import { describe, expect, it } from 'vitest';

import DbtNodeComponentSource from '../../components/canvas/DbtNodeComponent.tsx?raw';
import CanvasNodeShellSource from '../../components/canvas/CanvasNodeShell.tsx?raw';
import CanvasNodeContextMenuModelSource from '../../components/canvas/canvasNodeContextMenuModel.ts?raw';
import NodePropertySectionViewSource from '../../components/inspector/NodePropertySectionView.tsx?raw';
import NodePropertiesReadModelSource from '../../components/inspector/nodePropertiesReadModel.ts?raw';
import GraphNodeCardViewSource from '../../plugins/graph/GraphNodeCardView.tsx?raw';
import CanvasInspectorAuthoringContractSource from './canvasInspectorAuthoring.types.ts?raw';
import CanvasInspectorAuthoringSectionSource from './CanvasInspectorAuthoringSection.tsx?raw';
import CanvasNodePresentationCopySource from './canvasNodePresentationCopy.ts?raw';
import CanvasCopyTypesSource from './canvasCopy.types.ts?raw';
import CanvasAuthoringCopySource from './canvasCopyCatalog.authoring.ts?raw';
import CanvasToolbarCopySource from './canvasCopyCatalog.toolbar.ts?raw';
import CanvasToolbarCopyEsSource from './canvasCopyCatalog.toolbar.es.ts?raw';
import CanvasNodeMapperSource from './canvasNodeMapper.ts?raw';
import CanvasNodeWorkbenchPanelSource from './CanvasNodeWorkbenchPanel.tsx?raw';
import CanvasShellPanelsBuilderSource from './canvasShellPanelsBuilder.ts?raw';
import CanvasViewportSource from './CanvasViewport.tsx?raw';
import CanvasViewportSurfaceViewSource from './CanvasViewportSurfaceView.tsx?raw';
import DvtSqlTransformAuthoringSectionSource from './DvtSqlTransformAuthoringSection.tsx?raw';
import DvtAuthoringFieldsSource from './DvtAuthoringFields.tsx?raw';
import DbtProjectFileCanvasControllerSource from './useDbtProjectFileCanvasController.ts?raw';
import DbtWorkspaceFileCodeContributionSource from './dbtWorkspaceFileCodeContribution.tsx?raw';
import CanvasSelectionHandlersSource from './useCanvasSelectionHandlers.ts?raw';

describe('Canvas Node Workbench W4 hardening contracts', () => {
  it('maps node navigation gestures to one intent and keeps execution selection in ellipsis operations', () => {
    expect(CanvasNodeShellSource).toContain('data-slot="canvas-node-shell"');
    expect(CanvasNodeShellSource).toContain('onOpenNode?.();');
    expect(CanvasNodeShellSource).toContain('isCanvasNodeEmbeddedControlTarget(event.target)');
    expect(CanvasNodeShellSource).toContain('dvtNodeActionsRequest');
    expect(CanvasNodeShellSource).not.toContain('resolveCanvasNodeDoubleClickAction');
    expect(CanvasNodeShellSource).not.toContain('onOpenCode');
    expect(CanvasNodeShellSource).not.toContain('onOpenWorkbench');

    expect(GraphNodeCardViewSource).toContain('data-slot="graph-node-card-actions"');
    expect(GraphNodeCardViewSource).toContain("'dvtNodeActionsRequest'");
    expect(GraphNodeCardViewSource).not.toContain('data-slot="graph-node-card-play"');
    expect(GraphNodeCardViewSource).not.toContain('GraphNodeCardPlayAction');
    expect(GraphNodeCardViewSource).not.toContain('playAction');
    expect(DbtNodeComponentSource).toContain(
      'data.onToggleNodeSelection?.(id, !selectedForExecution)'
    );
    expect(DbtNodeComponentSource).toContain('buildCanvasNodeModelerActionModel');
    expect(DbtNodeComponentSource).toContain("data.onInspectNode?.(id, 'code');");
    expect(DbtNodeComponentSource).not.toContain('hasCodeSection');
    expect(CanvasNodeContextMenuModelSource).toContain('buildCanvasNodeModelerActionModel');
    expect(CanvasNodeContextMenuModelSource).not.toContain('inspect-node');
  });

  it('keeps Enter as the accessibility-equivalent path to the same node-entry gesture', () => {
    expect(CanvasViewportSurfaceViewSource).toContain(
      'export function activateFocusedCanvasNodeFromKeyboard'
    );
    expect(CanvasViewportSurfaceViewSource).toContain("event.key !== 'Enter'");
    expect(CanvasViewportSurfaceViewSource).toContain(
      'isCanvasNodeEmbeddedControlTarget(event.target)'
    );
    expect(CanvasViewportSurfaceViewSource).toContain(
      'querySelector<HTMLElement>(\'[data-slot="canvas-node-shell"]\')'
    );
    expect(CanvasViewportSurfaceViewSource).toContain("new MouseEventConstructor('dblclick'");
  });

  it('removes the left-click floating toolbar instead of hiding it', () => {
    expect(CanvasViewportSource).not.toContain('buildCanvasNodeFloatingToolbarModel');
    expect(CanvasViewportSource).not.toContain('open-toolbar');
    expect(CanvasViewportSource).not.toContain('nodeFloatingToolbarModel');
    expect(CanvasViewportSurfaceViewSource).not.toContain('CanvasNodeFloatingToolbarView');
    expect(CanvasViewportSurfaceViewSource).not.toContain('canvas-node-floating-toolbar');
  });

  it('retires floating-toolbar and navigation copy facts from current node contracts', () => {
    for (const retiredFact of [
      'canvasNodeToolbar',
      'openWorkbenchLabel',
      'workbenchGroupLabel',
      'executeGroupLabel',
      'canvasNodeContextOpenWorkbenchLabel',
      'canvasNodeContextWorkbenchGroupLabel',
      'canvasNodeContextExecuteGroupLabel',
      'nodeWorkbenchEditCodeFileLabel',
      'nodeWorkbenchEditCodeFileDescription',
      'sqlContextWorkbenchNodeTitle',
    ]) {
      expect(CanvasNodeContextMenuModelSource).not.toContain(retiredFact);
      expect(CanvasNodeMapperSource).not.toContain(retiredFact);
      expect(CanvasCopyTypesSource).not.toContain(retiredFact);
      expect(CanvasToolbarCopySource).not.toContain(retiredFact);
      expect(CanvasToolbarCopyEsSource).not.toContain(retiredFact);
    }
  });

  it('keeps the authoritative file editor inside Properties without a node workbench target', () => {
    expect(CanvasNodeWorkbenchPanelSource).toContain('setActiveTab(nextTabId);');
    expect(CanvasNodeWorkbenchPanelSource).not.toContain('canvas-node-workbench-open-code-editor');
    expect(DbtWorkspaceFileCodeContributionSource).toContain('WorkspaceFileCodeEditor');
    expect(DbtWorkspaceFileCodeContributionSource).toContain('authority="dbt-project-files"');
    expect(DbtProjectFileCanvasControllerSource).toContain(
      "setInspectorNode(nodeId, preferredTabId ?? 'general');"
    );
    expect(DbtProjectFileCanvasControllerSource).toContain('nodeCodeEditorRef.current?.flush()');
    expect(DbtProjectFileCanvasControllerSource).not.toContain('codeWorkbenchReturnNodeIdRef');
    expect(DbtProjectFileCanvasControllerSource).not.toContain("kind: 'node'");
  });

  it('keeps contextual Workbench help and close as compact right-aligned accessible controls', () => {
    expect(CanvasNodeWorkbenchPanelSource).toContain('CircleHelp');
    expect(CanvasNodeWorkbenchPanelSource).toContain('X');
    expect(CanvasNodeWorkbenchPanelSource).toContain(
      'data-slot="canvas-node-workbench-header-actions"'
    );
    expect(CanvasNodeWorkbenchPanelSource).toContain('data-slot="canvas-node-workbench-help"');
    expect(CanvasNodeWorkbenchPanelSource).toContain('data-slot="canvas-node-workbench-close"');
    expect(CanvasNodeWorkbenchPanelSource).toContain('copy.inspectorEditablePropertiesTitle');
    expect(CanvasNodeWorkbenchPanelSource).toContain('copy.inspectorEditablePropertiesDescription');
    expect(CanvasNodeWorkbenchPanelSource).toContain('aria-label={copy.nodeWorkbenchCloseLabel}');
    expect(CanvasNodeWorkbenchPanelSource).toContain("'min-w-0 flex-1'");
    expect(CanvasNodeWorkbenchPanelSource).toContain(
      'className="ml-auto flex shrink-0 items-center gap-1"'
    );
  });

  it('keeps primary Workbench tabs free of repeated General and Code presentation chrome', () => {
    expect(NodePropertySectionViewSource).toContain(
      "section.id === 'code' || section.id === 'general'"
    );
    expect(CanvasInspectorAuthoringSectionSource).not.toContain(
      'canvasViewCopy.inspectorEditablePropertiesTitle'
    );
    expect(CanvasInspectorAuthoringSectionSource).not.toContain(
      'canvasViewCopy.inspectorEditablePropertiesDescription'
    );
    expect(CanvasNodeWorkbenchPanelSource).toContain('copy.inspectorEditablePropertiesTitle');
    expect(CanvasNodeWorkbenchPanelSource).toContain('copy.inspectorEditablePropertiesDescription');
  });

  it('removes application-level React Flow click and visual-selection seams that own no behavior', () => {
    expect(CanvasSelectionHandlersSource).not.toContain('handleNodeClick');
    expect(CanvasSelectionHandlersSource).not.toContain('onSelectionChange');
    expect(DbtProjectFileCanvasControllerSource).not.toContain('handleNodeClick');
    expect(DbtProjectFileCanvasControllerSource).not.toContain('handleSelectionChange');
    expect(CanvasViewportSource).not.toContain('props.onNodeClick');
    expect(CanvasViewportSource).not.toContain('props.onSelectionChange');
  });

  it('retires the unconsumed Inspector modeler-actions projection instead of keeping duplicate command wiring', () => {
    expect(CanvasInspectorAuthoringContractSource).not.toContain(
      'CanvasInspectorNodeModelerActions'
    );
    expect(CanvasInspectorAuthoringContractSource).not.toContain('modelerActions');
    expect(CanvasShellPanelsBuilderSource).not.toContain('modelerActions');
    expect(CanvasShellPanelsBuilderSource).not.toContain('inspectorNodeSelectedForExecution');
  });

  it('routes read-only DVT transform columns through the canonical properties read model', () => {
    for (const visibleLiteral of [
      'Input columns',
      '} selected',
      "' not null'",
      'Connect a source with recorded columns to choose transform inputs.',
    ]) {
      expect(DvtSqlTransformAuthoringSectionSource).not.toContain(visibleLiteral);
    }

    for (const retiredAuthoringFact of [
      'buildDvtTransformColumnOptions',
      'nodePresentationColumnsLabel',
      'dvtFlowGuideRequiredLabel',
      'dvtFlowGuideColumnsMissingMessage',
      'selectedColumnRefs',
    ]) {
      expect(DvtSqlTransformAuthoringSectionSource).not.toContain(retiredAuthoringFact);
    }

    expect(DvtSqlTransformAuthoringSectionSource).not.toContain('name="dvt-transform-column"');
    expect(DvtAuthoringFieldsSource).not.toContain('selectedColumns');
    expect(DvtAuthoringFieldsSource).not.toContain('dvtTransformColumnModel');
    expect(DvtAuthoringFieldsSource).toContain('resolveDvtSubstraitPilotEntry');
    expect(NodePropertiesReadModelSource).toContain('buildInheritedColumnRows');
    expect(NodePropertiesReadModelSource).toContain('presentationTruth.columns.inherited');
    expect(NodePropertiesReadModelSource).toContain('source: column.sourceNodeName');
    expect(NodePropertiesReadModelSource).toContain('localizePropertyTableRows');
    expect(CanvasNodePresentationCopySource).toContain("input: 'Input'");
    expect(CanvasNodePresentationCopySource).toContain("input: 'Entrada'");
  });

  it('keeps one SQL editor and moves inherited connection context out of the Code surface', () => {
    expect(DvtSqlTransformAuthoringSectionSource.match(/<MonacoCodeEditor/g)).toHaveLength(1);
    expect(DvtSqlTransformAuthoringSectionSource).not.toContain(
      'canvasViewCopy.inspectorDvtSqlBodyLabel'
    );
    expect(DvtSqlTransformAuthoringSectionSource).not.toContain(
      'canvasViewCopy.inspectorDvtInheritedConnectionLabel'
    );
    expect(DvtSqlTransformAuthoringSectionSource).not.toContain('normalizedSqlLines');
  });
});
