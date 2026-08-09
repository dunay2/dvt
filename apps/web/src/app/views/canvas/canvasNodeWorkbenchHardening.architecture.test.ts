import { describe, expect, it } from 'vitest';

import DbtNodeComponentSource from '../../components/canvas/DbtNodeComponent.tsx?raw';
import CanvasNodeShellSource from '../../components/canvas/CanvasNodeShell.tsx?raw';
import CanvasNodeContextMenuModelSource from '../../components/canvas/canvasNodeContextMenuModel.ts?raw';
import GraphNodeCardViewSource from '../../plugins/graph/GraphNodeCardView.tsx?raw';
import CanvasInspectorAuthoringContractSource from './canvasInspectorAuthoring.types.ts?raw';
import CanvasNodePresentationCopySource from './canvasNodePresentationCopy.ts?raw';
import CanvasNodeWorkbenchPanelSource from './CanvasNodeWorkbenchPanel.tsx?raw';
import CanvasShellPanelsBuilderSource from './canvasShellPanelsBuilder.ts?raw';
import CanvasViewportSource from './CanvasViewport.tsx?raw';
import CanvasViewportSurfaceViewSource from './CanvasViewportSurfaceView.tsx?raw';
import DvtSqlTransformAuthoringSectionSource from './DvtSqlTransformAuthoringSection.tsx?raw';
import DbtProjectFileCanvasControllerSource from './useDbtProjectFileCanvasController.ts?raw';
import CanvasSelectionHandlersSource from './useCanvasSelectionHandlers.ts?raw';

describe('Canvas Node Workbench W4 hardening contracts', () => {
  it('maps node navigation gestures to one intent, preserves Play/Pause, and keeps ellipsis operations-only', () => {
    expect(CanvasNodeShellSource).toContain('data-slot="canvas-node-shell"');
    expect(CanvasNodeShellSource).toContain('onOpenNode?.();');
    expect(CanvasNodeShellSource).toContain('isCanvasNodeEmbeddedControlTarget(event.target)');
    expect(CanvasNodeShellSource).toContain('dvtNodeActionsRequest');
    expect(CanvasNodeShellSource).not.toContain('resolveCanvasNodeDoubleClickAction');
    expect(CanvasNodeShellSource).not.toContain('onOpenCode');
    expect(CanvasNodeShellSource).not.toContain('onOpenWorkbench');

    expect(GraphNodeCardViewSource).toContain('data-slot="graph-node-card-actions"');
    expect(GraphNodeCardViewSource).toContain("'dvtNodeActionsRequest'");
    expect(GraphNodeCardViewSource).toContain('data-slot="graph-node-card-play"');
    expect(GraphNodeCardViewSource).toContain('GraphNodeCardPlayAction');
    expect(GraphNodeCardViewSource).toContain('playAction');
    expect(DbtNodeComponentSource).toContain('buildCanvasNodeModelerActionModel');
    expect(DbtNodeComponentSource).toContain(
      "data.onInspectNode?.(id, hasCodeSection ? 'code' : 'general');"
    );
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

  it('keeps code inside Properties navigation before any file-authoritative editor opens', () => {
    expect(CanvasNodeWorkbenchPanelSource).toContain('setActiveTab(nextTabId);');
    expect(CanvasNodeWorkbenchPanelSource).toContain(
      'data-slot="canvas-node-workbench-open-code-editor"'
    );
    expect(DbtProjectFileCanvasControllerSource).toContain(
      "setInspectorNode(nodeId, preferredTabId ?? 'general');"
    );
    expect(DbtProjectFileCanvasControllerSource).toContain(
      "setCodeWorkbenchTarget({ kind: 'node', nodeId: node.id, initialPath: node.path });"
    );
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

  it('routes DVT transform column presentation through canonical localized role copy without losing input meaning', () => {
    for (const visibleLiteral of [
      'Input columns',
      '} selected',
      "' not null'",
      'Connect a source with recorded columns to choose transform inputs.',
    ]) {
      expect(DvtSqlTransformAuthoringSectionSource).not.toContain(visibleLiteral);
    }

    for (const copyKey of [
      'nodePresentationColumnsLabel',
      'dvtFlowGuideColumnsLabel',
      'dvtFlowGuideRequiredLabel',
      'dvtFlowGuideColumnsMissingMessage',
    ]) {
      expect(DvtSqlTransformAuthoringSectionSource).toContain(`canvasViewCopy.${copyKey}`);
    }

    expect(DvtSqlTransformAuthoringSectionSource).toContain('buildCanvasNodePresentationCopy');
    expect(DvtSqlTransformAuthoringSectionSource).toContain('valueLabels?.input');
    expect(CanvasNodePresentationCopySource).toContain("input: 'Input'");
    expect(CanvasNodePresentationCopySource).toContain("input: 'Entrada'");
  });
});
