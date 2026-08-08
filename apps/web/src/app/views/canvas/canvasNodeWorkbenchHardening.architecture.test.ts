import { describe, expect, it } from 'vitest';

import DbtNodeComponentSource from '../../components/canvas/DbtNodeComponent.tsx?raw';
import CanvasNodeWorkbenchPanelSource from './CanvasNodeWorkbenchPanel.tsx?raw';
import DvtSqlTransformAuthoringSectionSource from './DvtSqlTransformAuthoringSection.tsx?raw';
import AuthoringCopySource from './canvasCopyCatalog.authoring.ts?raw';
import AuthoringCopyEsSource from './canvasCopyCatalog.authoring.es.ts?raw';
import DbtProjectFileCanvasControllerSource from './useDbtProjectFileCanvasController.ts?raw';
import CanvasSelectionHandlersSource from './useCanvasSelectionHandlers.ts?raw';

describe('Canvas Node Workbench W4 hardening contracts', () => {
  it('routes node double-click through the existing code intent with a contextual fallback', () => {
    expect(DbtNodeComponentSource).toContain('const handleOpenWorkbench = () => {');
    expect(DbtNodeComponentSource).toContain("data.onInspectNode?.(id, 'code');");
    expect(DbtNodeComponentSource).toContain('data.onOpenNodeCode?.(id);');
    expect(DbtNodeComponentSource).toContain('onOpenWorkbench={handleOpenWorkbench}');
    expect(DbtNodeComponentSource).not.toContain(
      "? () => data.onInspectNode?.(id, null) : undefined"
    );
  });

  it('keeps contextual Workbench help and close as compact right-aligned accessible controls', () => {
    expect(CanvasNodeWorkbenchPanelSource).toContain('CircleHelp');
    expect(CanvasNodeWorkbenchPanelSource).toContain('X');
    expect(CanvasNodeWorkbenchPanelSource).toContain('data-slot="canvas-node-workbench-help"');
    expect(CanvasNodeWorkbenchPanelSource).toContain('data-slot="canvas-node-workbench-close"');
    expect(CanvasNodeWorkbenchPanelSource).toContain('copy.nodeWorkbenchHelpLabel');
    expect(CanvasNodeWorkbenchPanelSource).toContain('copy.nodeWorkbenchHelpDescription');
    expect(CanvasNodeWorkbenchPanelSource).toContain('aria-label={copy.nodeWorkbenchCloseLabel}');
  });

  it('removes application-level React Flow click and visual-selection seams that own no behavior', () => {
    expect(CanvasSelectionHandlersSource).not.toContain('handleNodeClick');
    expect(CanvasSelectionHandlersSource).not.toContain('onSelectionChange');
    expect(DbtProjectFileCanvasControllerSource).not.toContain('handleNodeClick');
    expect(DbtProjectFileCanvasControllerSource).not.toContain('handleSelectionChange');
  });

  it('routes DVT transform column presentation through the locale catalog', () => {
    for (const literal of [
      'Input columns',
      ' selected',
      ' not null',
      'Connect a source with recorded columns to choose transform inputs.',
    ]) {
      expect(DvtSqlTransformAuthoringSectionSource).not.toContain(literal);
    }

    for (const copyKey of [
      'inspectorDvtInputColumnsLabel',
      'inspectorDvtSelectedColumnsTemplate',
      'inspectorDvtNotNullLabel',
      'inspectorDvtNoInputColumnsMessage',
      'nodeWorkbenchHelpLabel',
      'nodeWorkbenchHelpDescription',
    ]) {
      expect(AuthoringCopySource).toContain(copyKey);
      expect(AuthoringCopyEsSource).toContain(copyKey);
    }
  });
});
