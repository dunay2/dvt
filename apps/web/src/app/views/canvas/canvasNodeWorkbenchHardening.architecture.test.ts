import { describe, expect, it } from 'vitest';

import DbtNodeComponentSource from '../../components/canvas/DbtNodeComponent.tsx?raw';
import CanvasNodeShellSource from '../../components/canvas/CanvasNodeShell.tsx?raw';
import CanvasInspectorAuthoringContractSource from './canvasInspectorAuthoring.types.ts?raw';
import CanvasNodePresentationCopySource from './canvasNodePresentationCopy.ts?raw';
import CanvasNodeWorkbenchPanelSource from './CanvasNodeWorkbenchPanel.tsx?raw';
import CanvasShellPanelsBuilderSource from './canvasShellPanelsBuilder.ts?raw';
import CanvasViewportSource from './CanvasViewport.tsx?raw';
import DvtSqlTransformAuthoringSectionSource from './DvtSqlTransformAuthoringSection.tsx?raw';
import DbtProjectFileCanvasControllerSource from './useDbtProjectFileCanvasController.ts?raw';
import CanvasSelectionHandlersSource from './useCanvasSelectionHandlers.ts?raw';

describe('Canvas Node Workbench W4 hardening contracts', () => {
  it('routes node double-click from the canonical node action model instead of dbt-specific branching', () => {
    expect(CanvasNodeShellSource).toContain('export function resolveCanvasNodeDoubleClickAction');
    expect(CanvasNodeShellSource).toContain("action.id === 'open-node-code' && !action.disabled");
    expect(CanvasNodeShellSource).toContain("action.id === 'inspect-node' && !action.disabled");
    expect(CanvasNodeShellSource).toContain("if (action === 'open-node-code')");
    expect(CanvasNodeShellSource).toContain('onContextMenuAction(action);');
    expect(CanvasNodeShellSource).toContain("if (action === 'open-workbench')");
    expect(CanvasNodeShellSource).toContain('onOpenWorkbench?.();');

    expect(DbtNodeComponentSource).not.toContain('const handleOpenWorkbench = () => {');
    expect(DbtNodeComponentSource).toContain(
      "typeof data.onInspectNode === 'function' ? () => data.onInspectNode?.(id, null) : undefined"
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
    expect(CanvasInspectorAuthoringContractSource).not.toContain('CanvasInspectorNodeModelerActions');
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
