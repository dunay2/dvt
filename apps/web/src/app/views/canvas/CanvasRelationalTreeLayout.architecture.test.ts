import { describe, expect, it } from 'vitest';
import layout from './CanvasRelationalTreeLayout.tsx?raw';
import placement from './useCanvasRelationalTreePlacement.ts?raw';

describe('relational tree layout boundary', () => {
  it('keeps geometry derivation in presentation placement and semantic writes outside both', () => {
    expect(layout).toContain('useCanvasRelationalTreePlacement');
    expect(layout).not.toMatch(/projectLayout\(|projectCanvasRelationalMovableCards|useMemo\(/);
    expect(placement).toContain('projectLayout(root, sizes, detached)');
    for (const source of [layout, placement]) {
      expect(source).not.toMatch(
        /useRelationCommand|saveWorkspaceGraphDraft|configureCanvasStagedTransform|fetch\(/
      );
      expect(source.split('\n').length).toBeLessThan(200);
    }
  });
});
