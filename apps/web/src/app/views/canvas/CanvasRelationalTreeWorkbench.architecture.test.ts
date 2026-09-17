import { describe, expect, it } from 'vitest';

import DetailSource from './CanvasRelationalTreeNodeDetail.tsx?raw';
import BlockCanvasSource from './CanvasRelationalTreeBlockCanvas.tsx?raw';
import CatalogueSource from './CanvasRelationalTreeSourceCatalogue.tsx?raw';
import OperandSlotSource from './CanvasRelationalTreeOperandSlot.tsx?raw';
import TreeSource from './CanvasRelationalTreeView.tsx?raw';
import ZoomSource from './CanvasRelationalTreeZoomControls.tsx?raw';
import WorkbenchSource from './CanvasRelationalTreeWorkbench.tsx?raw';
import EntrySource from './canvasRelationalCompositionEdgeInteraction.ts?raw';
import CanvasShellSource from './CanvasShell.tsx?raw';
import CodeWorkbenchSource from './DvtTransformCodeWorkbenchContent.tsx?raw';
import ApplyCommandSource from './useCanvasRelationalTreeApplyCommand.ts?raw';
import WorkbenchModelSource from './useCanvasRelationalTreeWorkbenchModel.ts?raw';
import AuthoringSessionSource from './useCanvasRelationalTreeAuthoringSession.ts?raw';
import AuthoringModelSource from './canvasRelationalTreeAuthoringModel.ts?raw';
import AuthoringOptionsSource from './useCanvasRelationalTreeAuthoringOptions.ts?raw';
import OperandSlotsSource from './useCanvasRelationalOperandSlots.ts?raw';
import ProjectionAuthoringSource from './canvasRelationalTreeProjectionAuthoring.ts?raw';

describe('Canvas relational-tree Workbench architecture', () => {
  it('keeps query consumption, catalogue, tree and detail in bounded components', () => {
    expect(WorkbenchSource.split('\n').length).toBeLessThan(140);
    expect(CatalogueSource.split('\n').length).toBeLessThan(100);
    expect(TreeSource.split('\n').length).toBeLessThan(150);
    expect(ZoomSource.split('\n').length).toBeLessThan(80);
    expect(DetailSource.split('\n').length).toBeLessThan(100);
    expect(WorkbenchModelSource.split('\n').length).toBeLessThan(180);
    expect(AuthoringSessionSource.split('\n').length).toBeLessThan(180);
    expect(ApplyCommandSource.split('\n').length).toBeLessThan(100);
    expect(AuthoringModelSource.split('\n').length).toBeLessThan(260);
    expect(BlockCanvasSource.split('\n').length).toBeLessThan(180);
    expect(OperandSlotSource.split('\n').length).toBeLessThan(80);
    expect(AuthoringOptionsSource.split('\n').length).toBeLessThan(100);
    expect(OperandSlotsSource.split('\n').length).toBeLessThan(90);
    expect(ProjectionAuthoringSource.split('\n').length).toBeLessThan(60);
    expect(WorkbenchModelSource).toContain('projectCanvasRelationalTree');
  });

  it('does not introduce a second Canvas or semantic write authority', () => {
    const combined = [
      WorkbenchSource,
      WorkbenchModelSource,
      CatalogueSource,
      TreeSource,
      ZoomSource,
      DetailSource,
      BlockCanvasSource,
      OperandSlotSource,
    ].join('\n');
    expect(combined).not.toContain('@xyflow/react');
    expect(combined).not.toContain('applyDvtSubstraitSemanticDocument');
    expect(combined).not.toContain('encodeDvtSubstrait');
    expect(combined).not.toContain('create(');
    expect(AuthoringSessionSource).toContain('useCanvasRelationalTreeApplyCommand');
    expect(ApplyCommandSource).toContain('authoring?.onApplyNodeDraft(');
    expect(ApplyCommandSource).not.toContain('applyInspectorNodeDraft');
    expect(WorkbenchSource).not.toContain('CanvasRelationalTreeAuthoringPanel');
    expect(WorkbenchSource).not.toContain('CanvasRelationalTreeDraftView');
    expect(WorkbenchSource).not.toContain('minmax(15rem,20rem)');
    expect(DetailSource).not.toContain('<aside');
  });

  it('routes pending and canonical badges to the single bottom-drawer Workbench', () => {
    expect(EntrySource).toContain('args.onActivate(dependency.targetId)');
    expect(EntrySource).not.toContain('inspectNode');
    expect(CanvasShellSource).toContain('<CanvasRelationalTreeWorkbench');
    expect(CanvasShellSource).toContain("selectOperationalDrawerTab('semantic')");
    expect(CodeWorkbenchSource).not.toContain('CanvasRelationalTreeWorkbench');
  });
});
