import { describe, expect, it } from 'vitest';
import layout from './CanvasRelationalTreeLayout.tsx?raw';
import placement from './useCanvasRelationalTreePlacement.ts?raw';
import positionState from './relational-layout/useRelationalCardPlacement.ts?raw';
import session from './relational-layout/RelationalLayoutSession.tsx?raw';
import gesture from './relational-layout/useRelationalCardMovement.ts?raw';

describe('relational tree layout boundary', () => {
  it('keeps geometry derivation in presentation placement and semantic writes outside both', () => {
    expect(layout).toContain('useCanvasRelationalTreePlacement');
    expect(layout).not.toMatch(/projectLayout\(|projectCanvasRelationalMovableCards|useMemo\(/);
    expect(placement).toContain('projectLayout(root, sizes, detached)');
    expect(session).toContain('useRelationalCardPlacement');
    expect(session).not.toMatch(/layoutCanvasRelationalTree\(|onPositionsChange\?\.\(/);
    expect(gesture).not.toMatch(/onPositionsChange|saveWorkspace|useState\(/);
    for (const source of [layout, placement, positionState, session, gesture]) {
      expect(source).not.toMatch(
        /useRelationCommand|saveWorkspaceGraphDraft|configureCanvasStagedTransform|fetch\(/
      );
      expect(source.split('\n').length).toBeLessThan(200);
    }
  });
});
