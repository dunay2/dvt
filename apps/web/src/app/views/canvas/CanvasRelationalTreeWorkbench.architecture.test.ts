import { describe, expect, it } from 'vitest';

import DetailSource from './CanvasRelationalTreeNodeDetail.tsx?raw';
import CatalogueSource from './CanvasRelationalTreeSourceCatalogue.tsx?raw';
import TreeSource from './CanvasRelationalTreeView.tsx?raw';
import ZoomSource from './CanvasRelationalTreeZoomControls.tsx?raw';
import WorkbenchSource from './CanvasRelationalTreeWorkbench.tsx?raw';
import EntrySource from './canvasRelationalCompositionEdgeInteraction.ts?raw';
import CanvasShellSource from './CanvasShell.tsx?raw';
import CodeWorkbenchSource from './DvtTransformCodeWorkbenchContent.tsx?raw';

describe('Canvas relational-tree Workbench architecture', () => {
  it('keeps query consumption, catalogue, tree and detail in bounded components', () => {
    expect(WorkbenchSource.split('\n').length).toBeLessThan(140);
    expect(CatalogueSource.split('\n').length).toBeLessThan(100);
    expect(TreeSource.split('\n').length).toBeLessThan(150);
    expect(ZoomSource.split('\n').length).toBeLessThan(80);
    expect(DetailSource.split('\n').length).toBeLessThan(100);
    expect(WorkbenchSource).toContain('projectCanvasRelationalTree');
  });

  it('does not introduce a second Canvas or semantic write authority', () => {
    const combined = [WorkbenchSource, CatalogueSource, TreeSource, ZoomSource, DetailSource].join(
      '\n'
    );
    expect(combined).not.toContain('@xyflow/react');
    expect(combined).not.toContain('applyDvtSubstraitSemanticDocument');
    expect(combined).not.toContain('encodeDvtSubstrait');
    expect(combined).not.toContain('create(');
  });

  it('routes pending and canonical badges to the single bottom-drawer Workbench', () => {
    expect(EntrySource).toContain('args.onActivate(dependency.targetId)');
    expect(EntrySource).not.toContain('inspectNode');
    expect(CanvasShellSource).toContain('<CanvasRelationalTreeWorkbench');
    expect(CanvasShellSource).toContain("selectOperationalDrawerTab('semantic')");
    expect(CodeWorkbenchSource).not.toContain('CanvasRelationalTreeWorkbench');
  });
});
