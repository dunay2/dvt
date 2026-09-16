import { describe, expect, it } from 'vitest';

import DetailSource from './CanvasRelationalTreeNodeDetail.tsx?raw';
import CatalogueSource from './CanvasRelationalTreeSourceCatalogue.tsx?raw';
import TreeSource from './CanvasRelationalTreeView.tsx?raw';
import WorkbenchSource from './CanvasRelationalTreeWorkbench.tsx?raw';
import EntrySource from './canvasRelationalCompositionEdgeInteraction.ts?raw';

describe('Canvas relational-tree Workbench architecture', () => {
  it('keeps query consumption, catalogue, tree and detail in bounded components', () => {
    expect(WorkbenchSource.split('\n').length).toBeLessThan(140);
    expect(CatalogueSource.split('\n').length).toBeLessThan(100);
    expect(TreeSource.split('\n').length).toBeLessThan(150);
    expect(DetailSource.split('\n').length).toBeLessThan(100);
    expect(WorkbenchSource).toContain('projectCanvasRelationalTree');
  });

  it('does not introduce a second Canvas or semantic write authority', () => {
    const combined = [WorkbenchSource, CatalogueSource, TreeSource, DetailSource].join('\n');
    expect(combined).not.toContain('@xyflow/react');
    expect(combined).not.toContain('applyDvtSubstraitSemanticDocument');
    expect(combined).not.toContain('encodeDvtSubstrait');
    expect(combined).not.toContain('create(');
  });

  it('routes pending and canonical badges through the existing node Workbench seam', () => {
    expect(EntrySource).toContain("inspectNode(dependency.targetId, 'code')");
    expect(EntrySource).not.toContain('onActivateCanonical');
  });
});
